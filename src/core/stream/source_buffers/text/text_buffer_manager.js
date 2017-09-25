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

/**
 * Maximum time difference, in seconds, for two text segment's start times
 * and/or end times for them to be considered the same in the custom text's
 * source buffer used for the "html" textTrackMode.
 *
 * For example for two segments s1 and s2 which have a start time respectively
 * of st1 and st2 and end time of et1 and et2:
 *   - if both the absolute difference between st1 and st2 AND the one between
 *     et1 and et2 is inferior or equal to the MAX_DELTA_BUFFER_TIME, s1 and s2
 *     are considered to target the exact same time. As a consequence, if s2 is
 *     added after s1 in the source buffer, s1 will be completely replaced by
 *     it and vice-versa.
 *   - if only one of the two (absolute difference between st1 and st2 OR et1
 *     and et2) is inferior to the MAX_DELTA_BUFFER_TIME then the last added
 *     is not completely considered the same. It WILL still replace - either
 *     partially or completely (depending on the sign of the other difference) -
 *     the previously added segment.
 *   - if both differences are strictly superior to the MAX_DELTA_BUFFER_TIME,
 *     then they are not considered to have the same start nor the same end.
 *     They can still overlap however, and MIGHT thus still replace partially
 *     or completely each other.
 *
 * Setting a value too low might lead to two segments targeting the same time,
 * both being present in the source buffer. In worst case scenarios, this could
 * lead to indicate that an unwanted text track is still here (theorically
 * though, this is a case that should never happen for reasons that might be too
 * long to explain here).
 *
 * Setting a value too high might lead to two segments targeting different times
 * to be wrongly believed to target the same time. In worst case scenarios, this
 * could lead to wanted text tracks being removed.
 * @type Number
 */
const MAX_DELTA_BUFFER_TIME = 0.2;

/**
 * @see MAX_DELTA_BUFFER_TIME
 * @param {Number} a
 * @param {Number} b
 * @returns {Boolean}
 */
const areNearlyEqual = (a, b) => Math.abs(a - b) <= MAX_DELTA_BUFFER_TIME;

/**
 * Get cue corresponding to the given time in an array of cues.
 * @param {Number} currentTime
 * @param {Array.<Object>} cues
 * @returns {Object|undefined}
 */
function getCueInCues(currentTime, cues) {
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (currentTime < cue.end) {
      if (currentTime >= cue.start) {
        return cue;
      } else {
        return;
      }
    }
  }
}

/**
 * Remove cue(s) in an array of cues which comes after a given time.
 * @param {Array.<Object>} cues
 * @param {Number} time
 */
function removeInCuesAfter(cues, time) {
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (time > cue.start) {
      cues.splice(i, cues.length - i);
      return;
    }
  }
  return;
}

/**
 * Remove cue(s) in an array of cues which comes before a given time.
 * @param {Array.<Object>} cues
 * @param {Number} time
 */
function removeInCuesBefore(cues, time) {
  for (let i = cues.length - 1; i >= 0; i--) {
    const cue = cues[i];
    if (time > cue.start) {
      cues.splice(0, i);
      return;
    }
  }
  return;
}

/**
 * Manage the buffer of the text sourcebuffer.
 * Allows to add and recuperate cues in a given buffer.
 *
 * Also manage overlapping cues groups.
 *
 * The immutability of individual Cue elements inserted is guaranteed.
 * That is, if the get method returns the same cue's reference, its properties
 * are guaranteed to have the exact same values than before. The inverse is
 * true, if the values are the same than before, the reference will stay the
 * same (this is useful to easily check if the DOM should be updated, for
 * example).
 * @class TextBufferManager
 */
export default class TextBufferManager {
  constructor() {
    /**
     * CuesBuffer structure: [
     *  {
     *     start: Number,
     *     end: Number,
     *     cues: [
     *      {
     *        start: Number,
     *        end: Number,
     *        element: HTMLElement,
     *      }
     *     ]
     *   }
     * ]
     * @type {Array.<Object>}
     */
    this._cuesBuffer = [];
  }

  /**
   * Get corresponding cue for the given time.
   * A cue is an object with three properties:
   *   - start {Number}: start time for which the cue should be displayed.
   *   - end {Number}: end time for which the cue should be displayed.
   *   - element {HTMLElement}: The cue to diplay
   * @param {Number} time
   * @returns {Object|undefined}
   */
  get(time) {
    const cuesBuffer = this._cuesBuffer;
    for (let i = 0; i < cuesBuffer.length; i++) {
      const cuesInfos = cuesBuffer[i];
      if (time < cuesInfos.end) {
        if (time >= cuesInfos.start) {
          return getCueInCues(time, cuesInfos.cues);
        } else {
          return;
        }
      }
    }
    return;
  }

  /**
   * Insert new cues in our text buffer.
   * cues is an array of objects with three properties:
   *   - start {Number}: start time for which the cue should be displayed.
   *   - end {Number}: end time for which the cue should be displayed.
   *   - element {HTMLElement}: The cue to diplay
   * @param {Array.<Object>} cues
   * @param {Number} start
   * @param {Number} end
   */
  insert(cues, start, end) {
    const cuesBuffer = this._cuesBuffer;
    const cuesInfosToInsert = { start, end, cues };
    for (let i = 0; i < cuesBuffer.length; i++) {
      let cuesInfos = cuesBuffer[i];
      if (start < cuesInfos.end) {
        if (areNearlyEqual(start, cuesInfos.start)) {
          if (areNearlyEqual(end, cuesInfos.end)) {
            // exact same segment
            //   ours:            |AAAAA|
            //   the current one: |BBBBB|
            //   Result:          |AAAAA|
            // Which means:
            //   1. replace the current cue with ours
            cuesBuffer[i] = cuesInfosToInsert;
            return;
          } else if (end < cuesInfos.end) {
            // our cue overlaps with the current one:
            //   ours:            |AAAAA|
            //   the current one: |BBBBBBBB|
            //   Result:          |AAAAABBB|
            // Which means:
            //   1. remove some cues at the start of the current one
            //   2. update start of current one
            //   3. add ours before the current one
            removeInCuesBefore(cuesInfos, end);
            cuesInfos.start = end;
            cuesBuffer.splice(i, 0, cuesInfosToInsert);
            return;
          }
          // our cue goes beyond the current one:
          //   ours:            |AAAAAAA|
          //   the current one: |BBBB|
          //   Result:          |AAAAAAA|
          // Here we have to delete any cuesInfos which end before ours end,
          // and see about the following one.
          do {
            cuesBuffer.splice(i, 1);
            cuesInfos = cuesBuffer[i];
          } while (cuesInfos && end > cuesInfos.end);

          if (!cuesInfos) {
            // There was no more cue, add ours
            cuesBuffer[i] = cuesInfosToInsert;
            return;
          } else if (areNearlyEqual(end, cuesInfos.end)) {
            cuesBuffer[i] = cuesInfosToInsert; // replace
            return;
          }
          // else -> end < cuesInfos.end (overlapping case)
          removeInCuesBefore(cuesInfos.cues, end);
          cuesInfos.start = end;
          cuesBuffer.splice(i, 0, cuesInfosToInsert);
          return;
        } else if (start < cuesInfos.start) {
          if (end < cuesInfos.start) {
            // our cue goes strictly before the current one:
            //   ours:            |AAAAAAA|
            //   the current one:           |BBBB|
            //   Result:          |AAAAAAA| |BBBB|
            // Which means:
            //   - add ours before the current one
            cuesBuffer.splice(i, 0, cuesInfosToInsert);
            return;
          } else if (areNearlyEqual(end, cuesInfos.start)) {
            // our cue goes just before the current one:
            //   ours:            |AAAAAAA|
            //   the current one:         |BBBB|
            //   Result:          |AAAAAAA|BBBB|
            // Which means:
            //   - update start time of the current one to be sure
            //   - add ours before the current one
            cuesInfos.start = end;
            cuesBuffer.splice(i, 0, cuesInfosToInsert);
            return;
          }
          // our cue overlaps the current one:
          //   ours:            |AAAAAAA|
          //   the current one:     |BBBBB|
          //   Result:          |AAAAAAABB|
          // Which means:
          //   1. remove some cues at the start of the current one
          //   2. update start of current one
          //   3. add ours before the current one
          removeInCuesBefore(cuesInfos.cues, end); // overlapping
          cuesInfos.start = end;
          cuesBuffer.splice(i, 0, cuesInfosToInsert);
          return;
        }
        // else -> start > cuesInfos.start
        if (end > cuesInfos.end || areNearlyEqual(end, cuesInfos.end)) {
          // our cue overlaps the current one:
          //   ours:              |AAAAAA|
          //   the current one: |BBBBB|
          //   Result:          |BBAAAAAA|
          //   - or -
          //   ours:              |AAAA|
          //   the current one: |BBBBBB|
          //   Result:          |BBAAAA|
          // Which means:
          //   1. remove some cues at the end of the current one
          //   2. update end of current one
          //   3. add ours after current one
          removeInCuesAfter(cuesInfos.cues, start); // overlapping
          cuesInfos.end = start;
          cuesBuffer.splice(i+1, 0, cuesInfosToInsert);
          return;
        }
        // else -> end < cuesInfos.end
        // our cue is in the current one:
        //   ours:              |AAA|
        //   the current one: |BBBBBBB|
        //   Result:          |BBAAABB|
        // Which means:
        //   1. split current one in two parts based on our cue.
        //   2. insert our cue into it.
        // TODO For now just replaced as:
        //   - 1: This will never happen
        //   - 2: 2lazy
        cuesBuffer[i] = cuesInfosToInsert;
        return;
      }
    }
    // no cues group has the end after our current start.
    // These cues should be the last one
    cuesBuffer.push(cuesInfosToInsert);
  }
}
