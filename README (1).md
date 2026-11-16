# SportGy

SportGy is a full-stack sports platform that brings athletes, coaches, local clubs and communities into one place. Athletes can book training sessions, share posts with other players, join competitions, and buy or sell sports gear. Coaches, club owners and administrators each have their own dashboard to manage their part of the platform.

This is a **portfolio project**.

---

## User roles and access

SportGy has four roles. Each role has its own dashboard.

| Role | Who they are | Dashboard |
| --- | --- | --- |
| **Client** | An athlete using the platform | Client dashboard |
| **Coach** | A coach offering training sessions | Coach dashboard |
| **Club owner** | The manager of a club | Club owner dashboard |
| **Admin** | A SportGy administrator | Admin dashboard |

### Dashboard access rules

**Every role can visit the normal client dashboard.** A coach, a club owner and an admin can all use the platform as a regular athlete, so they all have access to it.

**The other dashboards are private to their own role.** No role can visit another role's dashboard:

| Dashboard | Client | Coach | Club owner | Admin |
| --- | :---: | :---: | :---: | :---: |
| Client dashboard | Yes | Yes | Yes | Yes |
| Coach dashboard | No | **Yes** | No | No |
| Club owner dashboard | No | No | **Yes** | No |
| Admin dashboard | No | No | No | **Yes** |


### How access is enforced

Access is checked in two places:

1. **In the page:** each dashboard checks the logged-in user's role and only shows its content to the right role.
2. **In the database:** Supabase Row Level Security policies make sure a user can only read and change the data their role allows. This is the real protection, because hiding a page in the browser is not security on its own.



---

## Features

### Client

- **Booking:** book a session with a coach in four steps (sport, club, coach, then a day and time on a calendar). The booking window is the next 90 days, each session lasts 90 minutes, and slots that are taken or already passed cannot be selected.
- **Community:** publish text and image posts, like, comment, delete your own content, and filter the feed (all posts, my posts, posts with photos).
- **Competitions:** browse competitions, filter by status and sport, search, sort, apply, and see participants and final rankings.
- **Marketplace:** sell sports equipment such as tennis rackets, tennis balls and basketballs. A seller publishes a listing with a name, description, condition (**new** or **used**), price and phone number. Buyers contact the seller **directly** by **WhatsApp** or **phone call**. SportGy does not process payments.
- **Client dashboard:** the athlete's personal space, where they follow their bookings and activity.

### Coach dashboard

- See booking requests, upcoming sessions and history in three tabs.
- **Accept or refuse** booking requests, and cancel an accepted session (with a confirmation step).
- See the next session, sessions today, sessions in the next 7 days, and the money earned this month.
- New requests appear without refreshing the page.

### Club owner dashboard

- See every booking made with the club's coaches, with filters by status and coach.
- See the club's coaches with their upcoming and total sessions.
- **Competitions:** create competitions, **accept or refuse** athletes' applications, publish the final results (rank, score, note), and delete competitions.
- See coaches, bookings this month, revenue this month and the applications waiting for review.

### Admin dashboard

- Overview with a chart of bookings over the last 7 days, the latest bookings, and platform health checks (clubs without coaches, coaches without a club, sports without clubs).
- Browse users, clubs, coaches and competitions.
- **Manage sports:** add, edit and delete the sports shown on the site.
- **Moderate the community:** delete posts and comments.
- Delete clubs, coaches and competitions when needed.

### Homepage

A landing page with an auto-playing hero slider, the list of available sports, and sections presenting the community, competitions and marketplace features.

---

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| UI | React, [Tailwind CSS](https://tailwindcss.com/) |
| Backend | [Supabase](https://supabase.com/): Postgres database, authentication, file storage, Row Level Security |


---

## Pages



| Route | Description | Who can open it |
| --- | --- | --- |
| `/` | Homepage | Everyone |
| `/booking` | Step 1: choose a sport | Everyone |
| `/booking/[sportId]` | Step 2: choose a club | Everyone |
| `/booking/[sportId]/[clubId]` | Step 3: club details and coaches | Everyone |
| `/booking/[sportId]/[clubId]/[coachId]` | Step 4: book a session | Logged-in users |
| `/community` | Community feed | Everyone (log in to post) |
| `/competitions` | Competitions list and details | Everyone (log in to apply) |
| `/marketplace` | Sports gear marketplace | Everyone |
| `/coach` | Coach dashboard | **Coaches only** |
| `/club-owner` | Club owner dashboard | **Club owners only** |
| `/admin` | Admin dashboard | **Admins only** |

---

## Design

- **Colours:** yellow as the accent, near-black and beige backgrounds, with slate and stone for text.
- **Layout:** dark page headers with the content overlapping them, and alternating dark, beige and white sections on the homepage. All dashboards share the same look.
- **Motion:** gentle fade-in and hover animations, turned off for users who prefer reduced motion.
- **Icons:** inline SVG, no icon library.
- **Responsive:** designed for mobile, tablet and desktop.





