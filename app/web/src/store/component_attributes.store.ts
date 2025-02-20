import { defineStore } from "pinia";
import * as _ from "lodash-es";
import { addStoreHooks, ApiRequest } from "@si/vue-lib/pinia";

// Joi does not contain Joi.build() by default on browsers, so we import
// it directly from the lib build. We also had to import node's Buffer
// in web/main.ts for that to work
import Joi, { Schema } from "joi/lib/index";
import { useWorkspacesStore } from "@/store/workspaces.store";
import {
  PropertyEditorProp,
  PropertyEditorPropKind,
  PropertyEditorSchema,
  PropertyEditorValue,
  PropertyEditorValues,
} from "@/api/sdf/dal/property_editor";
import { nilId } from "@/utils/nilId";
import { Qualification } from "@/api/sdf/dal/qualification";
import { useChangeSetsStore } from "./change_sets.store";
import { useRealtimeStore } from "./realtime/realtime.store";
import { ComponentId, useComponentsStore } from "./components.store";
import { useStatusStore } from "./status.store";

export interface UpdatePropertyEditorValueArgs {
  attributeValueId: string;
  parentAttributeValueId?: string;
  propId: string;
  componentId: string;
  value?: unknown;
  key?: string;
}

export interface InsertPropertyEditorValueArgs {
  parentAttributeValueId: string;
  propId: string;
  componentId: string;
  value?: unknown;
  key?: string;
}

export interface DeletePropertyEditorValueArgs {
  attributeValueId: string;
  propId: string;
  componentId: string;
  value?: unknown;
  key?: string;
}

export interface SetTypeArgs {
  componentId: string;
  value?: unknown;
}

export type AttributeTreeItem = {
  propDef: PropertyEditorProp;
  children: AttributeTreeItem[];
  value: PropertyEditorValue | undefined;
  valueId: string;
  parentValueId: string;
  propId: string;
  mapKey?: string;
  arrayKey?: string;
  arrayIndex?: number;
};

export const useComponentAttributesStore = (componentId: ComponentId) => {
  const changeSetsStore = useChangeSetsStore();
  const changeSetId = changeSetsStore.selectedChangeSetId;

  const visibilityParams = {
    visibility_change_set_pk: changeSetId,
  };
  const workspacesStore = useWorkspacesStore();
  const workspaceId = workspacesStore.selectedWorkspacePk;

  return addStoreHooks(
    defineStore(
      `ws${
        workspaceId || "NONE"
      }/cs${changeSetId}/c${componentId}/component_attributes`,
      {
        state: () => ({
          // TODO: likely want to restructure how this data is sent and stored
          // but we'll just move into a pinia store as the first step...
          schema: null as PropertyEditorSchema | null,
          values: null as PropertyEditorValues | null,
        }),
        getters: {
          // recombine the schema + values + validations into a single nested tree that can be used by the attributes panel
          attributesTree: (state): AttributeTreeItem | undefined => {
            const { schema, values } = state;
            if (!schema || !values) return;

            const valuesByValueId = state.values?.values;
            const propsByPropId = state.schema?.props;
            const rootValueId = values.rootValueId;

            if (!valuesByValueId || !propsByPropId || !rootValueId) return;

            function getAttributeValueWithChildren(
              valueId: string,
              parentValueId: string,
              indexInParentArray?: number,
            ): AttributeTreeItem | undefined {
              /* eslint-disable @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-explicit-any */
              const value = valuesByValueId![valueId]!;

              const propDef = propsByPropId![value.propId as any];

              // some values that we see are for props that are hidden, so we filter them out
              if (!propDef) return;

              // console.log("HERE", value);

              return {
                propDef,
                value,
                valueId,
                parentValueId,
                // using isNil because its actually null (not undefined)
                ...(indexInParentArray === undefined &&
                  !_.isNil(value.key) && { mapKey: value.key }),
                ...(indexInParentArray !== undefined && {
                  arrayIndex: indexInParentArray,
                  arrayKey: value.key,
                }),
                propId: value.propId,
                children: _.compact(
                  _.map(values?.childValues[valueId], (cvId, index) =>
                    getAttributeValueWithChildren(
                      cvId,
                      valueId,
                      propDef.kind === "array" ? index : undefined,
                    ),
                  ),
                ),
              };
            }

            // dummy parent root value id - not used by anything
            return getAttributeValueWithChildren(rootValueId, "ROOT");
          },
          domainTree(): AttributeTreeItem | undefined {
            if (!this.attributesTree) return undefined;
            return _.find(
              this.attributesTree.children,
              (c) => c.propDef.name === "domain",
            );
          },
          secretsTree(): AttributeTreeItem | undefined {
            if (!this.attributesTree) return undefined;
            return _.find(
              this.attributesTree.children,
              (c) => c.propDef.name === "secrets",
            );
          },
          siTreeByPropName(): Record<string, AttributeTreeItem> | undefined {
            if (!this.attributesTree) return undefined;
            const siTree = _.find(
              this.attributesTree.children,
              (c) => c.propDef.name === "si",
            );
            return _.keyBy(siTree?.children, (prop) => prop.propDef.name);
          },

          // getter to be able to quickly grab selected component id
          selectedComponentId: () => componentId,
          selectedComponent: () => {
            if (!componentId) return;
            const componentsStore = useComponentsStore();
            return componentsStore.componentsById[componentId];
          },

          schemaValidation(): Qualification {
            const tree = this.domainTree;

            const output = [];
            let status: "success" | "failure" | "unknown" = tree
              ? "success"
              : "unknown";
            let failCounter = 0;

            // Walk down the prop tree and calculate all validations
            const queue = [
              {
                prop: tree,
                path: tree?.propDef.name,
              },
            ];
            while (queue.length > 0) {
              const { prop, path } = queue.pop() || {};
              if (!prop) break;

              const value = prop.value?.value || null;
              const kind = prop.propDef.kind;

              prop.children.forEach((c) => {
                let pathSuffix = "";

                switch (kind) {
                  case PropertyEditorPropKind.Array:
                    pathSuffix = `[${c.arrayIndex}]`;
                    break;
                  case PropertyEditorPropKind.Map:
                    pathSuffix = `.${c.mapKey}`;
                    break;
                  default:
                    break;
                }

                queue.push({
                  prop: c,
                  path: `${path}/${c.propDef.name}${pathSuffix}`,
                });
              });

              if (
                [
                  PropertyEditorPropKind.Array,
                  PropertyEditorPropKind.Map,
                  PropertyEditorPropKind.Object,
                ].includes(kind)
              ) {
                continue;
              }

              const validationFormat = (
                prop.propDef.validationFormat
                  ? Joi.build(JSON.parse(prop.propDef.validationFormat))
                  : Joi.any()
              ) as Schema;

              // NOTE(victor): Joi treats null as a value, so even if .required()
              // isn't set it fails validations for typed props
              const valueNotNull = value === null ? undefined : value;

              const { error } = validationFormat.validate(valueNotNull);

              const errorMessage = error?.message;

              if (errorMessage) {
                status = "failure";
                failCounter += 1;
              }
              // console.log(`${path} (${kind}): value ${value}`);
              // console.log(`${path}: ${errorMessage ?? "OK"}`);

              output.push({
                line: `${path}: ${errorMessage ?? "OK"}`,
                stream: "stdout",
                level: "log",
              });
            }

            return {
              title: "Schema Validation",
              output,
              result: {
                status,
                sub_checks: [
                  {
                    status,
                    description: `Component has ${failCounter} invalid value(s). Click "View Details" for more info.`,
                  },
                ],
              },
            };
          },
        },
        actions: {
          async FETCH_PROPERTY_EDITOR_SCHEMA() {
            return new ApiRequest<PropertyEditorSchema>({
              url: "component/get_property_editor_schema",
              params: {
                componentId: this.selectedComponentId,
                ...visibilityParams,
              },
              onSuccess: (response) => {
                if (this.selectedComponent === undefined) {
                  this.schema = response;
                  return;
                }

                const props: { [id: string]: PropertyEditorProp } = {};

                for (const propKey in response.props) {
                  const prop = response.props[propKey];
                  if (prop) {
                    const isHidden =
                      prop.name === "type" &&
                      this.selectedComponent.schemaName === "Generic Frame";
                    const isReadonly =
                      prop.name === "type" &&
                      this.selectedComponent.childNodeIds !== undefined &&
                      this.selectedComponent.childNodeIds.length > 0;

                    props[propKey] = {
                      ...prop,
                      isHidden,
                      isReadonly,
                    };
                  }
                }

                this.schema = { ...response, props };
              },
            });
          },
          async FETCH_PROPERTY_EDITOR_VALUES() {
            return new ApiRequest<PropertyEditorValues>({
              url: "component/get_property_editor_values",
              params: {
                componentId: this.selectedComponentId,
                ...visibilityParams,
              },
              onSuccess: (response) => {
                this.values = response;
              },
            });
          },

          reloadPropertyEditorData() {
            this.FETCH_PROPERTY_EDITOR_SCHEMA();
            this.FETCH_PROPERTY_EDITOR_VALUES();
          },

          async REMOVE_PROPERTY_VALUE(
            removePayload: DeletePropertyEditorValueArgs,
          ) {
            if (changeSetsStore.creatingChangeSet)
              throw new Error("race, wait until the change set is created");
            if (changeSetId === nilId())
              changeSetsStore.creatingChangeSet = true;

            return new ApiRequest<{ success: true }>({
              method: "post",
              url: "component/delete_property_editor_value",
              params: {
                ...removePayload,
                ...visibilityParams,
              },
              onSuccess() {
                const store = useComponentAttributesStore(componentId);
                store.reloadPropertyEditorData();
              },
            });
          },

          // combined these 2 api endpoints so they will get tracked under the same key, can revisit this later...
          async UPDATE_PROPERTY_VALUE(
            updatePayload:
              | { update: UpdatePropertyEditorValueArgs }
              | { insert: InsertPropertyEditorValueArgs },
          ) {
            if (changeSetsStore.creatingChangeSet)
              throw new Error("race, wait until the change set is created");
            if (changeSetId === nilId())
              changeSetsStore.creatingChangeSet = true;

            const isInsert = "insert" in updatePayload;

            // If the valueid for this update does not exist in the values tree,
            // we shouldn't perform the update!
            if (
              this.values?.values[
                isInsert
                  ? updatePayload.insert.parentAttributeValueId
                  : updatePayload.update.attributeValueId
              ] === undefined
            ) {
              return;
            }

            // tell the status store we've begun an update, even if we dont know how big it is yet
            // TODO: we may rely on backend events instead? although it would not be quite as fast
            const statusStore = useStatusStore();
            statusStore.markUpdateStarted();

            return new ApiRequest<{ success: true }>({
              method: "post",
              url: isInsert
                ? "component/insert_property_editor_value"
                : "component/update_property_editor_value",
              params: {
                ...(isInsert ? updatePayload.insert : updatePayload.update),
                ...visibilityParams,
              },
              onSuccess() {
                const store = useComponentAttributesStore(componentId);
                store.reloadPropertyEditorData();
              },
              onFail() {
                // may not work exactly right with concurrent updates... but I dont think will be a problem
                statusStore.cancelUpdateStarted();
              },
            });
          },
        },
        onActivated() {
          this.reloadPropertyEditorData();

          const realtimeStore = useRealtimeStore();
          realtimeStore.subscribe(this.$id, `changeset/${changeSetId}`, [
            {
              eventType: "ComponentUpdated",
              debounce: true,
              callback: (updated) => {
                if (updated.changeSetPk !== changeSetId) return;
                if (updated.componentId !== this.selectedComponentId) return;
                this.reloadPropertyEditorData();
              },
            },
          ]);

          return () => {
            realtimeStore.unsubscribe(this.$id);
          };
        },
      },
    ),
  )();
};
