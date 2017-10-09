/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import MediaError from "../errors/MediaError";

const BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];

// ugly, but helps TypeScript to infer type
interface HTMLElementConstructor {
  new(): HTMLElement;
}
interface HTMLVideoElementConstructor {
  new(): HTMLVideoElement;
}
interface VTTCueConstructor {
  new(start : number, end: number, text: string): VTTCue;
}
interface MediaSourceConstructor {
  new(): MediaSource;
}
interface MediaKeysConstructor {
  new(): MediaKeys;
}

// XXX TODO Better logic for TypeScript. Update in global.d.ts?
const win = window as any;
const HTMLElement_ : HTMLElementConstructor = win.HTMLElement;
const HTMLVideoElement_ : HTMLVideoElementConstructor = win.HTMLVideoElement;
const VTTCue_ : VTTCueConstructor = win.VTTCue || win.TextTrackCue;

const MediaSource_ : MediaSourceConstructor = (
  win.MediaSource ||
  win.MozMediaSource ||
  win.WebKitMediaSource ||
  win.MSMediaSource
);

let MediaKeys_ : MediaKeysConstructor = (
  win.MediaKeys ||
  win.MozMediaKeys ||
  win.WebKitMediaKeys ||
  win.MSMediaKeys
);

if (!MediaKeys_) {
  const noMediaKeys = () => {
    throw new MediaError("MEDIA_KEYS_NOT_SUPPORTED", null, true);
  };

  MediaKeys_ = class {
    public create : () => never;
    public isTypeSupported : () => never;
    public createSession : () => never;
    public setServerCertificate : () => never;
    constructor() {
      this.create = noMediaKeys;
      this.createSession = noMediaKeys;
      this.isTypeSupported = noMediaKeys;
      this.setServerCertificate = noMediaKeys;
    }
  };
}

// true for IE / Edge
const isIE : boolean = (
  navigator.appName === "Microsoft Internet Explorer" ||
  navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent)
);

const isFirefox : boolean = (
  navigator.userAgent.toLowerCase().indexOf("firefox") !== -1
);

const READY_STATES = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
};

export {
  BROWSER_PREFIXES,
  HTMLElement_,
  HTMLVideoElement_,
  MediaSource_,
  MediaKeys_,
  isIE,
  isFirefox,
  READY_STATES,
  VTTCue_,
};
