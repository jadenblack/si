type ValueFromKind = "inputSocket" | "outputSocket" | "prop";

interface ValueFrom {
  kind: ValueFromKind;
  socket_name?: string;
  prop_path?: string[];
}

interface IValueFromBuilder {
  setKind(kind: ValueFromKind): this;

  setSocketName(name: string): this;

  setPropPath(path: string[]): this;

  build(): ValueFrom;
}

/**
 * Gets a value from a socket or prop
 *
 * @example
 * const value = new ValueFromBuilder()
 *  .setKind("prop")
 *  .setPropPath(["root", "si", "name"])
 *  .build()
 */
declare class ValueFromBuilder implements IValueFromBuilder {
  valueFrom: ValueFrom;

  constructor();

  /**
   * The type of the builder
   *
   * @param {string} kind [inputSocket | outputSocket | prop]
   *
   * @returns this
   *
   * @example
   * .setKind("prop")
   */
  setKind(kind: ValueFromKind): this;

  /**
   * Specify the socket name if using an inputSocket or outputSocket
   *
   * @param {string} name
   *
   * @returns this
   *
   * @example
   * .setSocketName("Region")
   */
  setSocketName(name: string): this;

  /**
   * Specify the prop path if using a prop
   *
   * @param {string[]} path - a list of strings that represent the path to the prop
   *
   * @returns this
   *
   * @example
   *  .setPropPath(["root", "si", "name"])
   */
  setPropPath(path: string[]): this;

  /**
   * Build the object
   *
   * @example
   *  .build()
   */
  build(): ValueFrom;
}

type SocketDefinitionArityType = "many" | "one";

interface SocketDefinition {
  name: string;
  arity: SocketDefinitionArityType;
  uiHidden?: boolean;
  valueFrom?: ValueFrom;
}

interface ISocketDefinitionBuilder {
  setName(name: string): this;

  setArity(arity: SocketDefinitionArityType): this;

  setUiHidden(hidden: boolean): this;

  setValueFrom(valueFrom: ValueFrom): this;

  build(): SocketDefinition;
}

/**
 * Defines an input or output socket for passing values between components
 *
 * @example
 * const regionSocket = new SocketDefinitionBuilder()
 *  .setName("Region")
 *  .setArity("one")
 *  .build();
 */
declare class SocketDefinitionBuilder implements ISocketDefinitionBuilder {
  socket: SocketDefinition;

  constructor();

  /**
   * Build the object
   *
   * @example
   *  .build()
   */
  build(): SocketDefinition;

  /**
   * Specify the prop path if using a prop
   *
   * @param {string} arity - [one | many]
   *
   * @returns this
   *
   * @example
   *  .setArity("one")
   */
  setArity(arity: SocketDefinitionArityType): this;

  /**
   * The name of the socket. Note that this will be used to connect sockets
   * and to reference the socket within the asset.
   *
   * @param {string} name
   *
   * @returns this
   *
   * @example
   *  .setName("Subnet ID")
   */
  setName(name: string): this;

  /**
   * Add a field to the connection annotations array for the socket.
   * The input should be sequence of word chars (\w regex matcher), optionally
   * followed by any `<identifier>`, which makes it a supertype of `identifier`.
   * This can be repeated recursively as many times as necessary (see example).
   * At socket connecting time an *input* socket can receive a connection of any
   * *output* socket that has a compatible connection annotation.
   *
   * e.g. An input socket with the `Port<string>` connection
   * annotation can receive a
   * connection from an output socket with the `Docker<Port<string>>` annotation,
   * but not one with just `string`.
   *
   * The socket's name is always one of the connection annotations.
   *
   * @param {string} annotation
   *
   * @returns this
   *
   * @example
   *  .setConnectionAnnotation("EC2<IAM<string>>")
   */
  setConnectionAnnotation(annotation: string);

  /**
   * Should this socket show in the UI. Note that the socket can still be connected when the component is placed in a frame.
   *
   * @param {boolean} hidden
   *
   * @returns this
   *
   * @example
   *  .setName("Subnet ID")
   */
  setUiHidden(hidden: boolean): this;

  /**
   * Set the value of this socket using a ValueFromBuilder
   *
   * @param {ValueFrom} valueFrom
   *
   * @returns this
   *
   * @example
   *  .setValueFrom(new ValueFromBuilder()
   *    .setKind("inputSocket")
   *    .setSocketName("Region")
   *    .build())
   */
  setValueFrom(valueFrom: ValueFrom): this;
}

type PropWidgetDefinitionKind =
  "array"
  | "checkbox"
  | "codeEditor"
  | "color"
  | "comboBox"
  | "header"
  | "map"
  | "password"
  | "secret"
  | "select"
  | "text"
  | "textArea";

interface Option {
  label: string;
  value: string;
}

interface PropWidgetDefinition {
  kind: PropWidgetDefinitionKind;
  options: Option[];
}

interface IPropWidgetDefinitionBuilder {
  setKind(kind: string): this;

  addOption(key: string, value: string): this;

  build(): PropWidgetDefinition;
}

/**
 * Create a widget for interacting with a prop that is displayed in the modelling view.
 *
 * @example
 * const validation = new PropWidgetDefinitionBuilder()
 *  .setKind("text")
 *  .build()
 */
declare class PropWidgetDefinitionBuilder implements IPropWidgetDefinitionBuilder {
  propWidget: PropWidgetDefinition;

  constructor();

  /**
   * The type of widget
   *
   * @param {string} kind [array | checkbox | color | comboBox | header | map | secret | select | text | textArea | codeEditor]
   *
   * @returns this
   *
   * @example
   * .setKind("color")
   */
  setKind(kind: PropWidgetDefinitionKind): this;

  /**
   * Add an option when using a comboBox
   *
   * @param {string} key - the value displayed in the comboBox
   * @param {string} value - the value the prop is set to
   *
   * @returns this
   *
   * @example
   * .setOption("us-east-2 - US East (Ohio)", "us-east-2")
   */
  addOption(key: string, value: string): this;

  /**
   * Build the object
   *
   * @example
   *  .build()
   */
  build(): PropWidgetDefinition;
}

interface MapKeyFunc {
  key: string;
  valueFrom?: ValueFrom;
}

interface IMapKeyFuncBuilder {
  setKey(key: string): this;

  setValueFrom(valueFrom: ValueFrom): this;

  build(): MapKeyFunc;
}

/**
 * Used to add a value to a map
 *
 * @example
 *  const mapButton = new MapKeyFuncBuilder()
 *    .setKey("Name")
 *    .build()
 */
declare class MapKeyFuncBuilder implements IMapKeyFuncBuilder {
  mapKeyFunc: MapKeyFunc;

  constructor();

  /**
   * Build the object
   *
   * @example
   *  .build()
   */
  build(): MapKeyFunc;

  /**
   * Set the value of the key for the map entry
   *
   * @param {string} key - the name of the key
   *
   * @returns this
   *
   * @example
   *  .setKey("Name")
   */
  setKey(key: string): this;

  /**
   * Set the value of this key from a ValueFromBuilder
   *
   * @param {ValueFrom} valueFrom
   *
   * @returns this
   *
   * @example
   *  .setValueFrom(new ValueFromBuilder()
   *    .setKind("prop")
   *    .setPropPath(["root", "si", "name"])
   *    .build())
   */
  setValueFrom(valueFrom: ValueFrom): this;
}

type SiPropValueFromDefinitionKind = "color" | "name" | "resourcePayload";

interface SiPropValueFromDefinition {
  kind: SiPropValueFromDefinitionKind;
  valueFrom: ValueFrom;
}

interface ISiPropValueFromDefinitionBuilder {
  setKind(kind: SiPropValueFromDefinitionKind): this;

  setValueFrom(valueFrom: ValueFrom): this;

  build(): SiPropValueFromDefinition;
}

declare class SiPropValueFromDefinitionBuilder implements ISiPropValueFromDefinitionBuilder {
  definition: SiPropValueFromDefinition;

  constructor();

  /**
   * Build the object
   *
   * @example
   *  .build()
   */
  build(): SiPropValueFromDefinition;

  setKind(kind: SiPropValueFromDefinitionKind): this;

  setValueFrom(valueFrom: ValueFrom): this;
}

type PropDefinitionKind =
  "array"
  | "boolean"
  | "integer"
  | "map"
  | "object"
  | "string";

interface PropDefinition {
  name: string;
  kind: PropDefinitionKind;
  docLinkRef?: string;
  docLink?: string;
  documentation?: string;
  children?: PropDefinition[];
  entry?: PropDefinition;
  widget?: PropWidgetDefinition;
  valueFrom?: ValueFrom;
  hidden?: boolean;
  defaultValue?: any;
  validationFormat: string;
  mapKeyFuncs?: MapKeyFunc[];
}

interface IPropBuilder {
  setName(name: string): this;

  setKind(kind: PropDefinitionKind): this;

  setDocLinkRef(ref: string): this;

  setDocLink(link: string): this;

  setDocumentation(ref: string): this;

  addChild(child: PropDefinition): this;

  setEntry(entry: PropDefinition): this;

  setWidget(widget: PropWidgetDefinition): this;

  setValueFrom(valueFrom: ValueFrom): this;

  setHidden(hidden: boolean): this;

  setDefaultValue(value: any): this;

  setValidationFormat(format: Joi.Schema): this;

  addMapKeyFunc(func: MapKeyFunc): this;

  build(): PropDefinition;
}

/**
 * Creates a prop to attach values to an asset
 *
 * @example
 *  const propName = new PropBuilder()
 *   .setName("name")
 *   .setKind("string")
 *   .setWidget(new PropWidgetDefinitionBuilder().setKind("text").build())
 *  .build();
 */
declare class PropBuilder implements IPropBuilder {
  prop: PropDefinition;

  constructor();

  /**
   * Adds a child to an object type prop
   *
   * @param {PropDefinition} child
   *
   * @returns this
   *
   * @example
   *   .addChild(new PropBuilder()
   *     .setKind("string")
   *     .setName("sweetChildProp")
   *     .setDocumentation("This is the documentation for the prop")
   *     .setWidget(new PropWidgetDefinitionBuilder().setKind("text").build())
   *     .build())
   */
  addChild(child: PropDefinition): this;

  /**
   * Adds an entry to array or map type props
   *
   * @param {PropDefinition} entry
   *
   * @returns this
   *
   * @example
   *   .setEntry(new PropBuilder()
   *     .setKind("string")
   *     .setName("iamanentryprop")
   *     .setWidget(new PropWidgetDefinitionBuilder().setKind("text").build())
   *     .build())
   */
  setEntry(entry: PropDefinition): this;

  /**
   * Add a button for putting entries into maps
   *
   * @param {MapKeyFunc} func
   *
   * @returns this
   *
   * @example
   *  .addMapKeyFunc(new MapKeyFuncBuilder()
   *    .setKey("Name")
   *    .build()
   */
  addMapKeyFunc(func: MapKeyFunc): this;

  /**
   * Add joi validation schema to this prop
   *
   * @returns this
   *
   * @example
   * .setValidationFormat(Joi.string().required())
   *
   * See https://joi.dev/api/ for further details
   * @param format {Joi.Schema} - A joi schema object
   */
  setValidationFormat(format: Joi.Schema): this;

  /**
   * Build the object
   *
   * @example
   *  .build()
   */
  build(): PropDefinition;

  /**
   * Set a value to be automatically populated in the prop
   *
   * @param {any} value
   *
   * @returns this
   *
   * @example
   * .setDefaultValue("cats")
   */
  setDefaultValue(value: any): this;

  /**
   * Set a link to external documentation that will appear beneath the prop
   *
   * @param {string} link
   *
   * @returns this
   *
   * @example
   *  .setDocLink("https://www.systeminit.com/")
   */
  setDocLink(link: string): this;

  /**
   * Sets inline documentation for the prop
   *
   * @param {string} docs
   *
   * @returns this
   *
   * @example
   *  .setDocumentation("This is documentation for the prop")
   */
  setDocumentation(docs: string): this;

  setDocLinkRef(ref: string): this;

  /**
   * Whether the prop should be displayed in th UI or not
   *
   * @param {boolean} hidden
   *
   * @returns this
   *
   * @example
   *  .setHidden(true)
   */
  setHidden(hidden: boolean): this;

  /**
   * The type of the prop
   *
   * @param {string} kind [array | boolean | integer | map | object | string]
   *
   * @returns this
   *
   * @example
   * .setKind("text")
   */
  setKind(kind: PropDefinitionKind): this;

  /**
   * The prop name. This will appear in the model UI
   *
   * @param {string} name - the name of the prop
   *
   * @returns this
   *
   * @example
   * .setName("Region")
   */
  setName(name: string): this;

  /**
   * Set the value of this prop using a ValueFromBuilder
   *
   * @param {ValueFrom} valueFrom
   *
   * @returns this
   *
   * @example
   *  .setValueFrom(new ValueFromBuilder()
   *    .setKind("inputSocket")
   *    .setSocketName("Region")
   *    .build())
   */
  setValueFrom(valueFrom: ValueFrom): this;

  /**
   * The type of widget for the prop, determing how it is displayed in the UI
   *
   * @param {PropWidgetDefinition} widget
   *
   * @returns this
   *
   * @example
   * setWidget(new PropWidgetDefinitionBuilder()
   * .setKind("text")
   * .build())
   */
  setWidget(widget: PropWidgetDefinition): this;
}

interface SecretPropDefinition extends PropDefinition {
  hasInputSocket: boolean;
}

interface ISecretPropBuilder {
  setName(name: string): this;

  setSecretKind(kind: string): this;

  setDocLinkRef(ref: string): this;

  setDocLink(link: string): this;

  skipInputSocket(): this;

  build(): SecretPropDefinition;
}

/**
 * Creates a prop [and a socket] in an asset with which to connect a secret
 *
 * @example
 *  const secretPropName = new SecretPropBuilder()
 *   .setName("credential")
 *   .setSecretKind("DigitalOcean Credential")
 *  .build();
 */
declare class SecretPropBuilder implements ISecretPropBuilder {
  prop: SecretPropDefinition;

  constructor();

  /**
   * The secret prop name. This will appear in the model UI and can be any value
   *
   * @param {string} name - the name of the secret prop
   *
   * @returns this
   *
   * @example
   * .setName("token")
   */
  setName(name: string): this;

  /**
   * The type of the secret - relates to the Secret Definition Name
   *
   * @param {any} value
   *
   * @returns this
   *
   * @example
   * .setSecretKind("DigitalOcean Credential")
   */
  setSecretKind(kind: string): this;

  setDocLinkRef(ref: string): this;

  setDocLink(link: string): this;

  /**
   * Whether the prop should disable the auto-creation of an input socket
   *
   * @returns this
   *
   * @example
   *  .skipInputSocket()
   */
  skipInputSocket(): this;

  build(): SecretPropDefinition;
}

interface SecretDefinition {
  name: string;
  props: PropDefinition[];
}

interface ISecretDefinitionBuilder {
  addProp(prop: PropDefinition): this;

  build(): SecretDefinition;
}

/**
 * Creates a secret to be used with a set of assets
 *
 * @example
 * const secretDefinition = new SecretDefinitionBuilder()
 *          .setName("DigitalOcean Token")
 *         .addProp(
 *             new PropBuilder()
 *             .setKind("string")
 *             .setName("token")
 *             .setWidget(
 *                 new PropWidgetDefinitionBuilder()
 *                 .setKind("password")
 *                 .build()
 *             )
 *             .build()
 *         )
 *         .build();
 */
declare class SecretDefinitionBuilder implements ISecretDefinitionBuilder {
  definition: SecretDefinition;

  constructor();

  /**
   * The secret name. This corresponds to the kind of secret
   *
   * @param {string} name - the name of the secret kind
   *
   * @returns this
   *
   * @example
   * .setName("DigitalOcean Token")
   */
  setName(name: string): this;

  /**
   * Adds a Prop to the secret definition. These define the form fields for the secret input
   *
   * @param {PropDefinition} child
   *
   * @returns this
   *
   * @example
   *   .addProp(new PropBuilder()
   *     .setName("token")
   *     .setKind("string")
   *     .setWidget(new PropWidgetDefinitionBuilder().setKind("password").build())
   *     .build())
   */
  addProp(prop: PropDefinition): this;

  build(): SecretDefinition;
}

interface Asset {
  props: PropDefinition[];
  secretProps: SecretPropDefinition[];
  secretDefinition?: PropDefinition[];
  resourceProps: PropDefinition[];
  siPropValueFroms: SiPropValueFromDefinition[];
  inputSockets: SocketDefinition[];
  outputSockets: SocketDefinition[];
  docLinks: Record<string, string>;
}

interface IAssetBuilder {
  addProp(prop: PropDefinition): this;

  addSecretProp(prop: SecretPropDefinition): this;

  defineSecret(definition: SecretDefinition): this;

  addResourceProp(prop: PropDefinition): this;

  addInputSocket(socket: SocketDefinition): this;

  addOutputSocket(socket: SocketDefinition): this;

  addSiPropValueFrom(siPropValueFrom: SiPropValueFromDefinition): this;

  addDocLink(key: string, value: string): this;

  build(): Asset;
}

declare class AssetBuilder implements IAssetBuilder {
  asset: Asset;

  constructor();

  addProp(prop: PropDefinition): this;

  addSecretProp(prop: SecretPropDefinition): this;

  defineSecret(definition: SecretDefinition): this;

  addResourceProp(prop: PropDefinition): this;

  addInputSocket(socket: SocketDefinition): this;

  addOutputSocket(socket: SocketDefinition): this;

  addSiPropValueFrom(siPropValueFrom: SiPropValueFromDefinition): this;

  addDocLink(key: string, value: string): this;

  build(): Asset;
}
