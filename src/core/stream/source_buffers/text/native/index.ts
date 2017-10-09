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

import {
  addTextTrack,
  isVTTSupported,
} from "../../../../../compat";
import { AbstractSourceBuffer } from "../../abstract";
import parseTextTrackToCues from "./parsers";

/**
 * Returns true if the given codec is for a WebVTT text track.
 * @param {string} codec
 * @returns {Boolean}
 */
function isVTTFile(codec : string) : boolean {
  return /^text\/vtt/.test(codec);
}

/**
 * Source buffer to display TextTracks in a <track> element, in the given
 * video element.
 * @class NativeTextTrackSourceBuffer
 * @extends AbstractSourceBuffer
 */
export default class NativeTextTrackSourceBuffer extends AbstractSourceBuffer {
  private _videoElement : HTMLMediaElement;
  private _shouldBeCompleteVTTFile : boolean;
  private _track : TextTrack;
  private _trackElement? : HTMLTrackElement;

  /**
   * @param {string} codec
   * @param {HTMLMediaElement} videoElement
   * @param {Boolean} hideNativeSubtitle
   */
  constructor(
    codec : string,
    videoElement : HTMLMediaElement,
    hideNativeSubtitle : boolean
  ) {

    super(codec);
    this._videoElement = videoElement;
    this._shouldBeCompleteVTTFile = isVTTFile(codec);

    const {
      track,
      trackElement,
    } = addTextTrack(this._videoElement, hideNativeSubtitle);
    this._track = track;
    this._trackElement = trackElement;
  }

  /**
   * Append text tracks.
   * @param {Object} data
   * @param {string} data.data
   * @param {string} data.language
   * @param {Number} data.timescale
   * @param {Number} data.start
   * @param {Number|undefined} data.end
   */
  _append(data : any) : void {
    const {
      timescale, // timescale for the start and end
      start: timescaledStart, // exact beginning to which the track applies
      end: timescaledEnd, // exact end to which the track applies
      data: dataString, // text track content. Should be a string
      type, // type of texttracks (e.g. "ttml" or "vtt")
      language, // language the texttrack is in
    } = data;
    if (timescaledEnd - timescaledStart <= 0) {
      // this is accepted for error resilience, just skip that case.
      return;
    }

    const startTime = timescaledStart / timescale;
    const endTime = timescaledEnd != null ?
      timescaledEnd / timescale : undefined;

    if (this._shouldBeCompleteVTTFile) {
      if (type !== "vtt") {
        throw new Error("did not receive a vtt file in vtt mode.");

      } else if (isVTTSupported() && this._trackElement) {
        const blob = new Blob([dataString], { type: "text/vtt" });
        const url = URL.createObjectURL(blob);
        this._trackElement.src = url;
        this.buffered.insert(
          startTime,
          endTime != null ? endTime : Number.MAX_VALUE
        );

      } else {
        throw new Error("vtt subtitles not supported in vtt mode.");

      }
    } else { // native mode in non-vtt mode
      const cues = parseTextTrackToCues(type, dataString, language);
      if (cues.length > 0) {
        const firstCue = cues[0];

        // NOTE(compat): cleanup all current cues if the newly added
        // ones are in the past. this is supposed to fix an issue on
        // IE/Edge.
        const currentCues = this._track.cues;
        if (currentCues.length > 0) {
          if (
            firstCue.startTime < currentCues[currentCues.length - 1].startTime
          ) {
            this._remove(firstCue.startTime, +Infinity);
          }
        }

        cues.forEach((cue) => this._track.addCue(cue));
        this.buffered.insert(
          startTime,
          endTime != null ? endTime : cues[cues.length - 1].endTime
        );
      } else if (endTime != null) {
        this.buffered.insert(startTime, endTime);
      }
    }
  }

  /**
   * @param {Number} from
   * @param {Number} to
   */
  _remove(from : number, to : number) : void {
    const track = this._track;
    const cues = track.cues;
    for (let i = cues.length - 1; i >= 0; i--) {
      const cue = cues[i];
      const { startTime, endTime } = cue;
      if (startTime >= from && startTime <= to && endTime <= to) {
        track.removeCue(cue);
      }
    }
    this.buffered.remove(from, to);
  }

  _abort() : void {
    const { _trackElement, _videoElement } = this;
    if (
      _trackElement && _videoElement &&
      _videoElement.hasChildNodes()
    ) {
      try {
        _videoElement.removeChild(_trackElement);
      } catch (e) {}
    }

    if (this._track) {
      this._track.mode = "disabled";
    }

    if (this._trackElement) {
      this._trackElement.innerHTML = "";
    }
  }
}
