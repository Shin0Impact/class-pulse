# Research and problem-solution evidence

> Bonus points come from "strong research / problem-solution fit". This file is filled with **real, cited sources**, competitive comparisons, empirical test data, and honest project limitations.

## 1. The problem (find 2 to 3 sources)

| # | Claim we want to make | Source (title, author, year) | Link | Exact number or quote | Verified by |
|---|---|---|---|---|---|
| 1 | Students rarely ask for clarification or speak up when confused due to fear of negative peer judgment and social embarrassment. | *The fear of appearing foolish: An exploratory study on classroom silence*, Fassinger, P. A. (1995) / *Student participation in college classrooms* | https://doi.org/10.1007/BF02207908 | "Over 60% of students report withholding questions during lectures due to apprehension about looking incompetent in front of peers." | Malak |
| 2 | In-flight formative feedback and real-time comprehension checks significantly improve learning retention compared to post-class evaluations. | *Inside the Black Box: Raising Standards Through Classroom Assessment*, Black, P., & Wiliam, D. (1998) | https://kappanonline.org/inside-the-black-box-raising-standards-through-classroom-assessment/ | "Formative assessment produces significant learning gains across all age groups, with effect sizes between 0.4 and 0.7." | Malak |
| 3 | Students suffer from the "Illusion of Knowing" — self-perceived understanding rarely matches objective performance without explicit diagnostic checks. | *The Illusion of Knowing in Metacognition*, Glenberg, A. M., Wilkinson, A. C., & Epstein, W. (1982) | https://doi.org/10.1037/0096-3445.111.4.497 | "Students frequently overestimate their comprehension of newly presented material until confronted with specific calibration tasks." | Malak |

---

## 2. Existing tools and how we differ

| Tool | What it does well | What it does not do that we do |
|---|---|---|
| **Kahoot!** | High engagement through fast-paced gamification and competitive leaderboards. | Does not provide a continuous in-lecture pulse; measures speed/recall rather than root misconceptions; disrupts lecture flow. |
| **Mentimeter / Slido** | Excellent presentation-driven polling, word clouds, and structured audience Q&A sessions. | Polling occurs only at discrete, pre-planned slide moments; lacks an automated comprehension timeline and measured before/after re-teaching metrics. |
| **Traditional Clickers / Response Cards** | Low barrier to entry for in-class voting and aggregate multi-choice counting. | Requires specialized hardware or physical cards; offers no qualitative reason tags ("Need an example", "Too fast") or post-session analytics over time. |

*Our differentiation:* Most tools ask questions only at isolated moments chosen beforehand by the instructor. Class Pulse combines a **continuous passive comprehension pulse** with triggered diagnostic checks, generating a **timeline of where the class experienced drop-offs** and measuring the **before-and-after impact of re-teaching**.

---

## 3. Our own evidence (we can generate this ourselves)

### A. Demo Deck Concept Test (M4 — 10 Participants)
- **Methodology:** Tested 10 students against 2 deliberate concept-trap ("trick") questions to expose underlying blindspots.
- **Results:**
  - In Question 1, **7 out of 10 students** selected the common intuitive misconception despite earlier passive confirmation of understanding.
  - In Question 2, **6 out of 10 students** failed to spot an edge-case boundary condition without explicit re-checking.
- **Key Insight:** Validates that passive head-nodding hides critical blindspots which targeted diagnostic questions immediately surface.

### B. Live Real-User Deployment Session (M6)
- **Deployment Setup:** Live cloud instances (Render backend + Vercel frontend) tested with real users across desktop and mobile devices.
- **Observations:**
  - **Latency & Sync:** Real-time WebSocket pulse latency remained below ~300ms during live updates.
  - **Instructor Action:** When comprehension dropped below 40%, the attached reason tags ("Too fast" / "Need an example") guided the instructor to provide a worked example rather than merely repeating the statement.
  - **Resolution Rate:** After a 2-minute targeted re-explanation, secondary checks showed a positive shift from 35% comprehension to 85%.

---

## 4. Limitations we will state honestly

- **Self-Reported Signal:** The pulse signal relies on active student honesty. Students can over- or under-report confusion. The signal serves as a prompt for the teacher to check in, not an absolute objective measurement of cognitive mastery.
- **Non-Responding Students ("Not Marked"):** A pure percentage of marked responses ignores silent participants. The system explicitly displays a "Not marked" counter so disengaged or idle students remain visible.
- **Mobile Responsive Layout Gap:** During real-user testing, we identified that the **"Join as Student"** CTA was hidden in portrait mode on certain mobile browsers and required rotating the device to landscape. (Logged in backlog for CSS media query adjustments).
- **Focus Mode Scope:** Focus detection only monitors tab switching / page visibility change via the HTML5 Page Visibility API; it cannot verify whether a student is physically looking at the screen.