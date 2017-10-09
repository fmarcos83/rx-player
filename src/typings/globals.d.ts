// Webpack-defined globals
declare const __DEV__: boolean;
declare const __LOGGER_LEVEL__: string;
declare const __FEATURES__ : {
  SMOOTH : boolean,
  DASH : boolean,
  DIRECTFILE : boolean,
  NATIVE_TTML : boolean,
  NATIVE_SAMI : boolean,
  NATIVE_VTT : boolean,
  HTML_TTML : boolean,
};

// deprecated browser API
// typescript does not seem to know that one
declare const escape : (str : string) => string;

interface ObjectConstructor {
  /**
   * Creates an object that has the specified prototype or that has null prototype.
   * @param o Object to use as a prototype. May be null.
   */
  create(o: object | null): any;

  /**
   * Sets the prototype of a specified object o to  object proto or null. Returns the object o.
   * @param o The object to change its prototype.
   * @param proto The value of the new prototype or null.
   */
  setPrototypeOf(o: any, proto: object | null): any;
}

// for some reasons, Typescript seem to forget about SessionTypes
// TODO remove when the issue is resolved
// https://github.com/Microsoft/TypeScript/issues/19189
interface MediaKeySystemConfiguration {
  audioCapabilities?: MediaKeySystemMediaCapability[];
  distinctiveIdentifier?: MediaKeysRequirement;
  initDataTypes?: string[];
  persistentState?: MediaKeysRequirement;
  videoCapabilities?: MediaKeySystemMediaCapability[];
  sessionTypes: string[];
}

// typescript does not seem to know that one
// TODO Complete documentation
// TODO open a ticket on their side?
// declare class VTTCue {
//   id: string;
//   startTime : number;
//   endTime : number;
//   size : number;
//   vertical : string;
//   align : string;
//   position : string;
//   positionAlign : string;
//   lineAlign : string;
//   constructor(start : number, end : number, cueText : string);
// }
type VTTCue = TextTrackCue;
