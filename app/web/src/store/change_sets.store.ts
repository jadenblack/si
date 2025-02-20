import { defineStore } from "pinia";
import * as _ from "lodash-es";
import { watch } from "vue";
import { ApiRequest, addStoreHooks } from "@si/vue-lib/pinia";
import { ChangeSet, ChangeSetStatus } from "@/api/sdf/dal/change_set";
import router from "@/router";
import { UserId } from "@/store/auth.store";
import { nilId } from "@/utils/nilId";
import { useWorkspacesStore } from "./workspaces.store";
import { useRealtimeStore } from "./realtime/realtime.store";
import { useRouterStore } from "./router.store";

export type ChangeSetId = string;

const HEAD_ID = nilId();

export function useChangeSetsStore() {
  const workspacesStore = useWorkspacesStore();
  const workspacePk = workspacesStore.selectedWorkspacePk;

  return addStoreHooks(
    defineStore(`w${workspacePk || "NONE"}/change-sets`, {
      state: () => ({
        changeSetsById: {} as Record<ChangeSetId, ChangeSet>,
        changeSetsWrittenAtById: {} as Record<ChangeSetId, Date>,
        creatingChangeSet: false as boolean,
        postApplyActor: null as string | null,
        postAbandonActor: null as string | null,
        changeSetApprovals: {} as Record<UserId, string>,
      }),
      getters: {
        allChangeSets: (state) => _.values(state.changeSetsById),
        openChangeSets(): ChangeSet[] {
          return _.filter(this.allChangeSets, (cs) =>
            [
              ChangeSetStatus.Open,
              ChangeSetStatus.NeedsApproval,
              ChangeSetStatus.NeedsAbandonApproval,
            ].includes(cs.status),
          );
        },
        urlSelectedChangeSetId: () => {
          const route = useRouterStore().currentRoute;
          const id = route?.params?.changeSetId as ChangeSetId | undefined;
          return id === "head" ? HEAD_ID : id;
        },
        selectedChangeSet(): ChangeSet | null {
          return this.changeSetsById[this.urlSelectedChangeSetId || ""] || null;
        },
        headSelected(): boolean {
          return this.urlSelectedChangeSetId === HEAD_ID;
        },

        selectedChangeSetLastWrittenAt(): Date | null {
          return (
            this.changeSetsWrittenAtById[this.selectedChangeSet?.id || ""] ??
            null
          );
        },

        selectedChangeSetId(): ChangeSetId | undefined {
          return this.selectedChangeSet?.id;
        },

        // expose here so other stores can get it without needing to call useWorkspaceStore directly
        selectedWorkspacePk: () => workspacePk,
      },
      actions: {
        async setActiveChangeset(changeSetPk: string) {
          // We need to force refetch changesets since there's a race condition in which redirects
          // will be triggered but the frontend won't have refreshed the list of changesets
          if (!this.changeSetsById[changeSetPk]) {
            await this.FETCH_CHANGE_SETS();
          }

          const route = router.currentRoute.value;
          await router.push({
            name: route.name ?? undefined,
            params: {
              ...route.params,
              changeSetId: changeSetPk,
            },
          });
        },

        async FETCH_CHANGE_SETS() {
          return new ApiRequest<ChangeSet[]>({
            // TODO: probably want to fetch all change sets, not just open (or could have a filter)
            // this endpoint currently returns dropdown-y data, should just return the change set data itself
            url: "change_set/list_open_change_sets",
            onSuccess: (response) => {
              const changeSets = _.map(response, (rawChangeSet) => ({
                ...rawChangeSet,
                id: rawChangeSet.pk,
              }));
              // add our "head" changeset...
              // should simplify logic elsewhere to not treat head as special
              this.changeSetsById = {
                [HEAD_ID]: {
                  id: HEAD_ID,
                  pk: HEAD_ID,
                  name: "head",
                  status: ChangeSetStatus.Open,
                },
                ..._.keyBy(changeSets, "id"),
              };
            },
          });
        },
        async CREATE_CHANGE_SET(name: string) {
          return new ApiRequest<{ changeSet: ChangeSet }>({
            method: "post",
            url: "change_set/create_change_set",
            params: {
              changeSetName: name,
            },
            onSuccess: (response) => {
              this.changeSetsById[response.changeSet.pk] = response.changeSet;
            },
          });
        },
        async ABANDON_CHANGE_SET() {
          if (!this.selectedChangeSet) throw new Error("Select a change set");
          return new ApiRequest<{ changeSet: ChangeSet }>({
            method: "post",
            url: "change_set/abandon_change_set",
            params: {
              changeSetPk: this.selectedChangeSet.pk,
            },
            onSuccess: (response) => {
              // this.changeSetsById[response.changeSet.pk] = response.changeSet;
            },
          });
        },
        async APPLY_CHANGE_SET() {
          if (!this.selectedChangeSet) throw new Error("Select a change set");
          return new ApiRequest<{ changeSet: ChangeSet }>({
            method: "post",
            url: "change_set/apply_change_set",
            params: {
              changeSetPk: this.selectedChangeSet.pk,
            },
            onSuccess: (response) => {
              this.changeSetsById[response.changeSet.pk] = response.changeSet;
              // could switch to head here, or could let the caller decide...
            },
          });
        },
        async APPLY_CHANGE_SET_VOTE(vote: string) {
          if (!this.selectedChangeSet) throw new Error("Select a change set");
          return new ApiRequest({
            method: "post",
            url: "change_set/merge_vote",
            params: {
              vote,
              visibility_change_set_pk: this.selectedChangeSet.pk,
            },
          });
        },
        async BEGIN_APPROVAL_PROCESS() {
          if (!this.selectedChangeSet) throw new Error("Select a change set");
          return new ApiRequest({
            method: "post",
            url: "change_set/begin_approval_process",
            params: {
              visibility_change_set_pk: this.selectedChangeSet.pk,
            },
          });
        },
        async CANCEL_APPROVAL_PROCESS() {
          if (!this.selectedChangeSet) throw new Error("Select a change set");
          return new ApiRequest({
            method: "post",
            url: "change_set/cancel_approval_process",
            params: {
              visibility_change_set_pk: this.selectedChangeSet.pk,
            },
          });
        },

        // TODO(Wendy) - these endpoints do not exist yet!
        async APPLY_ABANDON_VOTE(vote: string) {
          if (!this.selectedChangeSet) throw new Error("Select a change set");
          return new ApiRequest({
            method: "post",
            url: "change_set/abandon_vote",
            params: {
              vote,
              visibility_change_set_pk: this.selectedChangeSet.pk,
            },
          });
        },
        async BEGIN_ABANDON_APPROVAL_PROCESS() {
          if (!this.selectedChangeSet) throw new Error("Select a change set");
          return new ApiRequest({
            method: "post",
            url: "change_set/begin_abandon_approval_process",
            params: {
              visibility_change_set_pk: this.selectedChangeSet.pk,
            },
          });
        },
        async CANCEL_ABANDON_APPROVAL_PROCESS() {
          if (!this.selectedChangeSet) throw new Error("Select a change set");
          return new ApiRequest({
            method: "post",
            url: "change_set/cancel_abandon_approval_process",
            params: {
              visibility_change_set_pk: this.selectedChangeSet.pk,
            },
          });
        },
        // TODO: async CANCEL_CHANGE_SET() {},

        // other related endpoints, not necessarily needed at the moment, but available
        // - change_set/get_change_set
        // - change_set/update_selected_change_set (was just fetching the change set info)

        getAutoSelectedChangeSetId() {
          const lastChangeSetId = sessionStorage.getItem(
            `SI:LAST_CHANGE_SET/${workspacePk}`,
          );
          if (
            lastChangeSetId &&
            this.changeSetsById[lastChangeSetId]?.status ===
              ChangeSetStatus.Open
          ) {
            return lastChangeSetId;
          }

          if (this.openChangeSets?.length <= 2) {
            // will select the single open change set or head if thats all that exists
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return _.last(this.openChangeSets)!.pk;
          }

          // can add more logic to auto select eventually...

          return false;
        },
        getGeneratedChangesetName() {
          let latestNum = 0;
          _.each(this.allChangeSets, (cs) => {
            const labelNum = Number(cs.name.split(" ").pop());
            if (!_.isNaN(labelNum) && labelNum > latestNum) {
              latestNum = labelNum;
            }
          });
          return `Change Set ${latestNum + 1}`;
        },
      },
      onActivated() {
        if (!workspacePk) return;
        this.FETCH_CHANGE_SETS();
        const stopWatchSelectedChangeSet = watch(
          () => this.selectedChangeSet,
          () => {
            // store last used change set (per workspace) in localstorage
            if (this.selectedChangeSet && workspacePk) {
              sessionStorage.setItem(
                `SI:LAST_CHANGE_SET/${workspacePk}`,
                this.selectedChangeSet.pk,
              );
            }
          },
          { immediate: true },
        );

        const realtimeStore = useRealtimeStore();
        realtimeStore.subscribe(this.$id, `workspace/${workspacePk}`, [
          {
            eventType: "ChangeSetCreated",
            callback: this.FETCH_CHANGE_SETS,
          },
          {
            eventType: "ChangeSetCancelled",
            callback: (data) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { changeSetPk, userPk } = data as any as {
                changeSetPk: string;
                userPk: UserId;
              };
              const changeSet = this.changeSetsById[changeSetPk];
              if (changeSet) {
                changeSet.status = ChangeSetStatus.Abandoned;
                if (this.selectedChangeSet?.pk === changeSetPk) {
                  this.postAbandonActor = userPk;
                }
                this.changeSetsById[changeSetPk] = changeSet;
              }

              this.FETCH_CHANGE_SETS();
            },
          },
          {
            eventType: "ChangeSetApplied",
            callback: (data) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { changeSetPk, userPk } = data as any as {
                changeSetPk: string;
                userPk: UserId;
              };
              const changeSet = this.changeSetsById[changeSetPk];
              if (changeSet) {
                changeSet.status = ChangeSetStatus.Applied;
                if (this.selectedChangeSet?.pk === changeSetPk) {
                  this.postApplyActor = userPk;
                }
                this.changeSetsById[changeSetPk] = changeSet;
              }
            },
          },
          {
            eventType: "ChangeSetBeginApprovalProcess",
            callback: (data) => {
              if (this.selectedChangeSet?.pk === data.changeSetPk) {
                this.changeSetApprovals = {};
              }
              const changeSet = this.changeSetsById[data.changeSetPk];
              if (changeSet) {
                changeSet.status = ChangeSetStatus.NeedsApproval;
                changeSet.mergeRequestedAt = new Date().toISOString();
                changeSet.mergeRequestedByUserId = data.userPk;
              }
            },
          },
          {
            eventType: "ChangeSetCancelApprovalProcess",
            callback: (data) => {
              if (this.selectedChangeSet?.pk === data.changeSetPk) {
                this.changeSetApprovals = {};
              }
              const changeSet = this.changeSetsById[data.changeSetPk];
              if (changeSet) {
                changeSet.status = ChangeSetStatus.Open;
              }
            },
          },

          {
            eventType: "ChangeSetBeginAbandonProcess",
            callback: (data) => {
              if (this.selectedChangeSet?.pk === data.changeSetPk) {
                this.changeSetApprovals = {};
              }
              const changeSet = this.changeSetsById[data.changeSetPk];
              if (changeSet) {
                changeSet.status = ChangeSetStatus.NeedsAbandonApproval;
                changeSet.abandonRequestedAt = new Date().toISOString();
                changeSet.abandonRequestedByUserId = data.userPk;
              }
            },
          },
          {
            eventType: "ChangeSetCancelAbandonProcess",
            callback: (data) => {
              if (this.selectedChangeSet?.pk === data.changeSetPk) {
                this.changeSetApprovals = {};
              }
              const changeSet = this.changeSetsById[data.changeSetPk];
              if (changeSet) {
                changeSet.status = ChangeSetStatus.Open;
              }
            },
          },

          {
            eventType: "ChangeSetWritten",
            debounce: true,
            callback: (changeSetId) => {
              // we'll update a timestamp here so individual components can watch this to trigger something if necessary
              // hopefully with more targeted realtime updates we won't need this, but could be useful for now
              this.changeSetsWrittenAtById[changeSetId] = new Date();
              this.FETCH_CHANGE_SETS();
            },
          },
          {
            eventType: "ChangeSetMergeVote",
            callback: (data) => {
              if (this.selectedChangeSet?.pk === data.changeSetPk) {
                this.changeSetApprovals[data.userPk] = data.vote;
              }
            },
          },
          {
            eventType: "ChangeSetAbandonVote",
            callback: (data) => {
              if (this.selectedChangeSet?.pk === data.changeSetPk) {
                this.changeSetApprovals[data.userPk] = data.vote;
              }
            },
          },
        ]);

        return () => {
          stopWatchSelectedChangeSet();
          realtimeStore.unsubscribe(this.$id);
        };
      },
    }),
  )();
}
