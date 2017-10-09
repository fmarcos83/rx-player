export interface ISegmentArguments {
  // -- required
  id : number|string;
  init : boolean;
  timescale : number;

  // - optional
  duration? : number;
  indexRange? : [number, number]|null;
  media? : string;
  number? : number;
  range? : [number, number]|null;
  time? : number; // /!\ undefined only for init segment
}

export interface IRepresentationIndexArguments {
  index : any; // TODO @ index refacto
  rootId : string|number;
}

export interface IRepresentationArguments {
  // -- required
  bitrate : number;
  codecs : string;
  index : any; /* TODO @ index refacto */

  // -- optional
  baseURL? : string;
  bitsPerSample? : number;
  channels? : any; // XXX TODO
  codecPrivateData? : any; // XXX TODO
  height? : number;
  id? : string|number;
  mimeType? : string;
  packetSize? : number;
  samplingRate? : number;
  width? : number;
}

export interface IAdaptationArguments {
  // -- required
  manual : boolean;
  representations : IRepresentationArguments[];
  type : string;

  // -- optional
  audioDescription? : boolean;
  closedCaption? : boolean;
  contentProtection? : any; // XXX TODO
  id? : number|string;
  language? : string;
  normalizedLanguage? : string;
  smoothProtection? : any; // XXX TODO
}

export interface IManifestArguments {
  id : number|string;
  transportType : string;
  duration : number;
  adaptations : {
    audio? : IAdaptationArguments[],
    video? : IAdaptationArguments[],
    text? : IAdaptationArguments[],
    image? : IAdaptationArguments[],
  }; // TODO IAdaptationsArguments
  type? : string;
  locations : string[];
  suggestedPresentationDelay? : number;
  availabilityStartTime? : number;
  presentationLiveGap? : number;
  timeShiftBufferDepth? : number;
}

interface IManifestAdaptations {
  text? : IAdaptation[];
  image? : IAdaptation[];
  video? : IAdaptation[];
  audio? : IAdaptation[];
}

export interface ISegment {
  id : number|string;
  duration : number|undefined;
  isInit : boolean;
  range : [number, number]|undefined;
  time : number|undefined; // undefined only for init segment
  indexRange : [number, number]|undefined;
  number : number|undefined;
  timescale : number;
  media : string;
}

export interface IRepresentation {
  // required
  id : string|number;
  index : IRepresentationIndex;

  // optional
  baseURL? : string;
  bitrate : number;
  codec? : string;
  height? : number;
  mimeType? : string;
  width? : number;

  _bitsPerSample? : number;
  _channels? : any; // TODO
  _codecPrivateData? : any; // TODO
  _packetSize? : number;
  _samplingRate? : number;
}

export interface IManifest {
  id : string|number;
  transport : string;
  adaptations : any;
  periods : any;
  isLive : boolean;
  uris : string[];
  suggestedPresentationDelay? : number;
  availabilityStartTime : number;
  presentationLiveGap? : number;
  timeShiftBufferDepth? : number;

  getDuration() : number;
  getUrl() : string;
  getAdaptations() : IAdaptation[];
  getAdaptation(id : number|string) : IAdaptation|undefined;
  updateLiveGap(delta : number) : void;
}

export interface IAdaptation {
  // required
  id : string|number;
  representations : IRepresentation[];
  type : string;

  // optional
  _smoothProtection? : any; // XXX TODO
  contentProtection? : any; //  XXX TODO
  isAudioDescription? : boolean;
  isClosedCaption? : boolean;
  language? : string;
  manual? : boolean;
  normalizedLanguage? : string;
}

export interface IRepresentationIndex {
  getInitSegment() : ISegment;
  getSegments(up : number, duration : number) : ISegment[];
  shouldRefresh(time : number, up : number, to : number) : boolean;
  getFirstPosition() : number|undefined;
  getLastPosition() : number|undefined;
  checkDiscontinuity(time : number) : number;
  scale(time : number) : number;
  setTimescale(timescale : number) : any;
  _addSegments(
    nextSegments : any, // XXX TODO
    currentSegment : any // XXX TODO
  ) : any /* XXX TODO */;
  update(newIndex : any /* TODO @ index refacto */) : void;
  getType() : string;
}
