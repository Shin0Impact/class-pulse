# Architecture

```
 Student phones (React)                     Teacher dashboard (React)
   tap green / yellow / red                   topic, "Check in now", live %
        |  Socket.IO                               |  Socket.IO
        +-------------------+     +----------------+
                            v     v
                  Express + Socket.IO server (Node)
                  |  socket/  teacherHandlers, studentHandlers  (thin)
                  |  services/ sessionService  <- live state in memory: students, colors,
                  |                               check-ins, timeline
                  |            pulseService    <- class understanding %, reasons, before/after
                  |            views.js        <- what each side is sent
                  v
              Supabase (Postgres)  <- history log only, best effort, never blocks the class
```

## Key decisions

1. **Self-reported, not graded.** The teacher asks verbally, so the app cannot know what is correct. Students report how well they follow; the value is the aggregate, live, without hand-raising.
2. **Continuous, with check-ins.** Colors can change at any time (the live signal). **Check in now** freezes the current stretch as a "check-in" with its topic and %, clears all colors, and starts a new one. The same topic twice gives the before/after.
3. **One formula, shown on screen.** Understanding % = (green x 100 + yellow x 50 + red x 0) / students who marked. Students who have not marked are excluded and shown as "Not marked". With nobody marked the value is `null` (shown as a dash), never a fake 0%.
4. **Live state in memory, database as a log.** Sub-100ms updates and no risk that a slow database freezes the classroom. Trade-off: a server restart ends running classes.
5. **Rooms per class.** `<code>:teacher` and `<code>:students`.
6. **Reconnection is a first-class feature.** Phones sleep. A student sends their `studentId` again on every reconnect and gets their color and the topic back; a color tapped while offline is re-sent. The teacher's `teacher:rejoin` returns a full snapshot.
7. **Ack callbacks for requests, broadcasts for updates.** Every client-to-server request returns `{ ok, ... }` or `{ ok:false, error }` (`socket/helpers.js`).

## Data model (live, in memory)

```
session   { code, title, students: Map, checkIns: [finished], current: {id, topic, startedAt}, timeline: [], focusMode }
student   { id, name, connected, status: green|yellow|red|waiting, reason, focus }
checkIn   { id, topic, startedAt, endedAt, counts, marked, total, pct }      (finished ones are the history)
timeline  [{ t, pct, marked, total, checkInId }]                              (one point per change)
```

## Flow

1. Teacher: `teacher:create` returns a code and a snapshot. Students: `student:join`.
2. Teacher: `teacher:checkIn { topic }`. Server emits `checkin:started` to students (topic, colors cleared) and to the teacher (history), then a `pulse:update`.
3. Any time: student `student:setStatus { status, reason? }`. Server updates the student, appends a timeline point, emits `pulse:update` to the teacher.
4. `pulse:update` carries everything the dashboard draws: `pct`, `counts`, `marked`, `total`, `reasons`, `perStudent`, and `comparison` (live before/after against the latest earlier check-in with the same topic).
5. Teacher re-explains and taps **Check in now** again with the same topic: the previous check-in goes into the history with its %, and `comparison` fills in as students re-mark.
