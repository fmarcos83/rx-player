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

import log from "../../../../../utils/log.js";
import {
  addTextTrack,
} from "../../../../../compat";
import { AbstractSourceBuffer } from "../../abstract.js";
import parseTextTrackToCues from "./parsers.js";

/**
 * Source buffer to display TextTracks in a <track> element, in the given
 * video element.
 * @class NativeTextTrackSourceBuffer
 * @extends AbstractSourceBuffer
 */
export default class NativeTextTrackSourceBuffer extends AbstractSourceBuffer {
  /**
   * @param {string} codec
   * @param {HTMLMediaElement} videoElement
   * @param {Boolean} hideNativeSubtitle
   */
  constructor(codec, videoElement, hideNativeSubtitle) {
    super(codec);
    const {
      track,
      trackElement,
    } = addTextTrack(videoElement, hideNativeSubtitle);

    this._videoElement = videoElement;
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
  _append(data) {
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
      log.warn("Invalid subtitles appended");
      return;
    }

    const startTime = timescaledStart / timescale;
    const endTime = timescaledEnd != null ?
      timescaledEnd / timescale : undefined;

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

  /**
   * @param {Number} from
   * @param {Number} to
   */
  _remove(from, to) {
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

  _abort() {
    const {
      _trackElement,
      _videoElement,
    } = this;

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
      this._track = null;
    }

    if (this._trackElement) {
      this._trackElement.innerHTML = "";
      this._trackElement = null;
    }
  }
}

