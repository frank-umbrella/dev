# loadout

Loadout is the shop's inventory tool: what is on each shelf, how many feet are
left in each wire box, who has each expensive unit, and the jobs whose pull
sheets turn an accepted Portal proposal into a staged bay, a van load, and a
confirmed delivery. Since 0.8.0 it opens on the jobs the shop does (pick up
from staging, confirm a delivery, pull for a job, receive a shipment, audit a
shelf) rather than on data types. Phone first for the
warehouse, desktop for the office. Internal: no hub tile, no links from other
pages, `noindex, nofollow`, and the shared Watchtower sign-in
(`@umbrellaautomation.com` Google accounts only). The plan is `PLAN.md`; the
chosen look is direction B, Ledger, in `design-preview.html`.

Current version: **0.10.0**.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app: markup, styles, and script in one file. |
| `qr.js` | Vendored QR encoder (qrcode-generator 1.4.4, MIT, by Kazuhiko Arase), loaded locally so labels never depend on a CDN. |
| `favicon.svg`, `icon-192.png`, `icon-512.png` | The hard-case mark. The PNGs are rendered from the SVG. |
| `manifest.json` | Add to Home Screen: standalone, named Loadout, opens on Home (`start_url` `./#home`). |
| `sw.js` | Service worker: keeps the app shell, the zxing barcode fallback, and the Firebase modules on the device so Loadout opens with no signal. The cache name carries the version. |
| `og-image.svg`, `og-image.png` | Link preview card in the house style. |
| `PLAN.md`, `design-preview.html`, `storyboard.html` | Plan, design switcher, and the owner's storyboard. |
| `simple-preview.html` | The 0.8.0 Simple mode switcher (PLAN 18): option A, three doors, and the word Pull sheet, as approved. |
| `samples/` | Real data for testing the importer. Git-ignored; never commit it. |

## Using it

Words (0.8.0, PLAN 18): a **Job** is what was called a ticket (same number,
same record); its lines are the **Pull sheet**. A job goes **Pull** (shelf to
bay), **Stage** (in the bay), **Pick up** (out of the bay into a person's
van), **Deliver** (confirmed at the client's site). **Shelf** is what were Stock and
Units; **Office** is what were More and the Console; **Audit** is counting a
shelf. A carrier's box at the shop has **Arrived** (since 0.9.0); Deliver and
Delivered only ever mean the client's site. The tab bar on the phone and the nav on the desktop are the same five:
Home, Jobs, Scan (the raised button), Shelf, Office. Since 0.10.0 (PLAN 22.2)
the last one reads **More** for a tech, whose sections there are Labels,
Movements, This phone, and About; its heading, crumbs, and every message that
names it follow the role, and the address stays `#office/...` for everyone.

**Who is signed in** (0.10.0, PLAN 24) sits at the right of the header: the
sync pill with the person's name beside it, and the role under them in grey
(Admin, Warehouse, Tech, Accounting). On a phone the name moves into the
sheet and the block is the pill with the role under it. The whole block is
one 44 px button that opens the **Account** sheet: name, email, role, one
sentence on what that role can do, and **Sign out** (Leave the demo in demo
mode). Sign out is no longer a bare button in the header, so a stray tap
cannot end a session in the middle of a pull. The footer shows the version
only. The Loadout mark and name at the top left are one link to your Home
(`#home`, so a middle-click or the keyboard work as on any link; 44 px tall
on a phone): accounting lands on Office, Reports as before, the demo keeps
its address, and on Home already it scrolls back to the top.

- **Home**: five colored doors for warehouse and admin, most used on top,
  each with the verb and one line that leads with how much waits behind it:
  **Pick up from staging** (dark slate, "3 jobs waiting"), **Confirm a
  delivery** (green, "2 in vans, 1 in the bay"), **Pull for a job** (amber,
  "3 jobs to pull, 2 waiting on orders"), **Receive a shipment** (slate grey,
  "2 arrived, 3 on the way"), and **Audit a shelf** (blue, "5 shelves due", never
  audited or over 60 days) last. The count is the length of the list the
  door opens; a door with nothing behind it reads in grey (Nothing staged,
  Nothing to deliver, Nothing to pull, Nothing on the way, All shelves audited). Hovering a door
  shows when to use it. Under them, every open job as a card with one progress
  line that names only the steps above zero ("Pulled 2 of 9, Staged 2";
  "Pulled 3 of 3, Picked up 2, Staged 1"; "Delivered 2 of 2" when it is done)
  and one button, its next step: Start pulling (nothing pulled yet), Keep
  pulling, Pick up, Confirm delivery, or Close job. Admins also get New job and a Week link there. A tech's Home is **Out
  with me** (picked-up lines by job with Confirm delivery and **Bring back**,
  then the units checked out to them, each with its job and since when) and
  the Pick up and Confirm a delivery doors, with the same counts. Accounting lands on Office, Reports; the board account on the wall
  board. A door's color runs as a thin band along the top of its screens
  (the job page and the Pull screen take the Pull amber) and nowhere else.
  Each door's list (`#pull`, `#pickup`, `#deliver`, `#receive`, `#audit`)
  starts with a **Home** link above its heading (0.11.1, PLAN 28.1: a
  chevron and the word, 44 px on a phone), since the home-screen app has no
  browser Back; one level in, the crumb's first part leads back to the list
  ("Pull for a job / Job 1042", "All locations").
- **Pull for a job** (0.9.0): the jobs a shelf can feed now, soonest install
  first, then a quiet **Waiting on orders** group for jobs whose lines only
  an order can cover. A card opens the job's **Pull screen** (`#pull/<jobId>`),
  the same shape as Pick up and Confirm a delivery: client, job, bay, install
  date, Open the job, and the progress line; then the lines grouped by the
  shelf to pull from, in the board's pick order. Each line is the product
  (with the wire box label for a box), how much is needed from that shelf,
  and one button, "Pull 4", which opens the pull sheet with that shelf and
  quantity filled in. A line split across two shelves shows under each with
  its share. **Waiting on orders** lists what the shelves cannot cover with
  its PO status or "Not ordered yet", and warehouse and admin get **Order
  what is short** there. **In the bay** lists the pulled lines, ticked. With
  nothing left on a shelf the screen says "Everything on the shelf is
  pulled." with a Pick up button. The full job page stays as it was for the
  office.
- **Receive a shipment** (0.9.0, warehouse and admin): boxes coming to the
  shop, arrived first ("Arrived, not received", the box is in the building),
  then on the way with the expected date. Each card has the vendor, the PO,
  the carrier and tracking link, each line with where it goes (the job's bay
  when the line serves a job, else the product's own shelf), and **Receive**.
  A product worth its own QR (cost at or above the QR threshold) asks for
  each unit's serial number or MAC address on the receive sheet, the same
  two fields and MAC check as Receive and Serialize on Shelf. Office, Orders
  and tracking keeps its Tracking tab with every package.
- **Pick up from staging**: the jobs with product in a bay. On a job, every
  staged line is ticked; untick what stays and press **Pick up**. One
  `pickup` movement per line, serialized units check out to you (the check-out
  Deliver used to write), counted stock leaves the bay, and the job and lines
  carry who picked up and when.
- **Confirm a delivery**: picked-up jobs first, then jobs still in a bay (the
  warehouse delivering straight from it), newest install date first. On a
  job every line in a van or the bay is ticked; **Delivered to site** writes
  the deliver movements for the ticked lines in one batch and stamps who and
  when on the job. An unticked line stays where it is, with an optional note
  ("Left in the van") on the line. The done box says who confirmed it and when.
- **Bring back** (0.9.0): on Out with me and on the Confirm a delivery
  screen when a line is in a van. For a postponed job or a line that is not
  needed: tick the lines coming back (none are ticked to start), pick where
  they go (the job's bay, preselected; warehouse and admin can also pick a
  shelf), add a note if you like. Per line it lowers what is picked up, puts
  the count back on that location, writes one `move` movement ("Brought back
  from the van, job #1058"), checks the line's serialized units in there
  (staged in the bay, or in stock with the job cleared on a shelf, where the
  line then needs pulling again), and stamps who and when on the line. A tech
  brings back to the job's bay; the warehouse puts it on a shelf from there.
- **Audit a shelf**: every location (shelves, bays, vans, vehicles) with
  "Last audited Nov 2" or "Never audited", the longest since an audit first;
  over 60 days reads amber. On a location: each product with stock there, the
  expected number faint, a number field with - and + and **Matches**; each
  serialized unit with Here and Not here; each wire box with its last reading
  and a Mark now field. **Finish audit** writes one `adjust` movement (note
  "Audit") per corrected product, a `note` movement for a unit not found
  (its status does not change; Shelf shows "Not found at last audit" for the
  admin to decide), a reading for each box with a new mark, and
  `lastAuditedAt` on the location, then toasts "2 corrected, 9 matched".
  Warehouse and admin audit; offline it saves on the device like any change.
- **Jobs** (was Tickets): jobs grouped by status, with a
  search (job number, client, job name, proposal, or bay; `/` jumps to it),
  filters for status, client, install date, items to order, and backorders,
  and an Install column that sorts, a Progress strip, and one next-step
  button per job. **New job** (rebuilt in 0.10.0, PLAN 22.1) says what a job
  is in one sentence, then offers two large choices. **Make the list
  yourself** (first and picked for the warehouse) is three short steps with
  "Step 2 of 3" above each: *Who it is for* (the client, picked or typed as
  New client, the job name, "Service call, lobby TV" for example, and an
  optional bay and install date), *The list* (one search over the shelf list
  with a **Scan** button beside it; tap a result to add it, a minus and plus
  stepper of 44 px sets how many, in feet for wire; each line says what the
  shelf holds: "12 on the shelf", "Only 2 on the shelf, 4 will be short", or
  "Not on the shelf, will need ordering"; **Not on the list? Type it** adds a
  note line; **Group by room** is off until wanted), and *Check and create*,
  the list with its totals in one sentence ("7 lines: 5 on the shelf, 2 to
  order"). **Create job** lands on the job's Pull screen for warehouse and
  admin. **Use a proposal file (.csv)** (first and picked for the admin)
  says where the file comes from (the three Portal steps sit in a
  disclosure), takes the file by Choose or by drop, and shows **Here is what
  the file says**: the proposal number, then every line in plain words
  marked *On the shelf list*, *New to Loadout (will be added)* (with Add to
  the shelf list to untick), or *Kept as a note (no brand or model)*. The
  column table opens only when Loadout cannot find a quantity and a brand,
  model, or description; otherwise it sits closed under **Something look
  wrong? Fix the columns**, and the skipped rows sit closed under their
  count. **Paste the text instead** stays, closed. The client, job, proposal
  number, bay, and install date follow under Who it is for. The word CSV
  shows only as "(.csv)", and every button and empty state says New job.
  Back keeps what was added, and Cancel, the X, or Escape ask before
  throwing typed lines away. Nothing about what is written changed: the
  same ids, line fields, saved column map, and re-import rule (the same
  proposal number again adds or adjusts lines on that job). **Add lines** on
  a job offers the same two choices. Each job says where it came from (From
  the proposal file, Imported from Portal, or Built by hand), and a job
  Zapier made from Portal carries an "Imported from Portal, review" chip
  until someone checks it.
- **Job** (was Ticket): the pull sheet grouped by area. Each line shows one
  button, its next step (Pull 2 from Warehouse, Short: order 2, Stage, Pick
  up, Deliver), and the rest (Stage, Note, and so on) under the **...** sheet;
  Pull everything in stock; Copy for Portal (it now lists what is on order,
  with PO, carrier, and dates); Print pull sheet; Show on board; Pick up and
  Confirm delivery when they apply; and Close job,
  which returns or writes off what is left in the bay and marks units out on
  the job installed. Since 0.9.0 Close job also lists what is **Still in a
  van** and with whom, and will not close until each of those lines is
  delivered or brought back; only an admin may write it off there instead,
  with a reason. The header carries the install date and the strip.
  Each line leads with its state: Pull, Staged (or "Staged 2 of 4"), Picked
  up, Delivered, On order (with the ETA, or "Arrived, not received"), or Short
  (red: the shelves and open POs do not cover it). **Order missing** and a
  line's **Order** put the Short quantity on a draft purchase order, and each
  line shows a chip per PO, for example "PO 7731, UPS 1Z999AA1: Shipped,
  Oct 23". The Jobs list, its "Has items to order" filter, the job's
  strip, the board, and Week all count Short the same way. A job flagged for review has a
  **Mark reviewed** button (warehouse and admin) that clears the flag and logs who
  did it.
- **Orders**: purchase orders with filters for status and vendor. A draft's
  empty Vendor select glows until one is picked; a vendor typed there joins the
  list in Settings. An order shows its lines (ordered, backordered with the
  vendor's ETA, shipped, arrived, received, and the job line each serves)
  and its shipments. **Mark ordered** needs the vendor and the vendor's order
  number, and asks where it ships: the office, or straight to the job's site
  (the select glows until picked; left alone it means the office; a stock PO
  always ships to the office). With Show costs on it also lists each line's
  unit cost, filled from the product's last cost and editable; with costs off
  the last cost is stored without asking. **Add shipment** guesses the carrier from the tracking number (1Z is
  UPS, 12 or 15 digits FedEx, 20 to 22 digits starting with 9 USPS; it can be
  changed), carries some or all of the lines, takes the expected date, and
  can send that one box somewhere other than the PO says. **Receive** walks a shipment
  line by line: tap to take the quantity, or scan each unit's UPC to count it;
  lines for a job go into its staging bay and count as staged, the rest go
  on a shelf; units at or above the QR threshold become serialized units
  ("Product name #n"), with a serial and a MAC field on the sheet (0.9.0)
  and a prompt to print their labels.
- **Tracking**: split down the middle. Left, packages coming to the office;
  right, packages going straight to a client's site, grouped by client and job;
  along the bottom, Recently received or arrived, the last 30 days newest first (a
  sortable table with Columns). Each package is a card with the carrier, the
  tracking number as a link (a 44 px target), what is in it, the PO and vendor,
  who it is for, and its status with the date and time of that status. Late
  packages say "Expected Oct 30, 3 days late" in amber; a box that arrived at the
  office and is not received floats to the top in amber. Office cards have
  Receive, job-site cards have **Mark arrived** (the lines count as received
  on the PO and staged on the job; nothing goes into stock), and both have
  Note. Lines no shipment carries yet show as one card per PO (Ordered or
  Backordered, with Add shipment). Filters for client and job, vendor,
  carrier, status, and late apply to all three parts, and each column header
  counts its packages. Under 900 px the columns stack, office first.
- **Week**: the staging schedule as a timesheet, one block per day with a card
  per job by its install date and each line's status on the right. Previous
  week, This week, Next week; a Work week toggle (remembered per person) hides
  the weekend and shows a chip when a hidden day has work. Past days are faded,
  today has a soft blue border, and jobs with no install date sit in an
  Unscheduled list with a date field. On the phone the days stack, today first.
- **Board** (`?board=1`, and the landing view for the board role): the
  warehouse TV, since 0.8.0 a grid of up to six job cards, three across and
  two down (PLAN 18.6). With more than six it turns page by page at the saved
  rotation interval, with a dot per page along the bottom and the 6 px bar
  along the top; with fewer the cards grow to fill the screen, and one job
  fills it. Each card: client, job name and number, bay, the strip with the
  Pull amber as a band, then the lines still to pull grouped by shelf in rack
  order, pulled lines greyed, picked-up lines greyed as "In the van",
  on-order amber, short red, and "+3 more lines" when the card runs out of
  room (a line is never cut). Pinned jobs come first (Every open job mode
  adds the rest by install date). Card titles 32 px, lines 24 px, nothing
  under 22 px; the light theme keeps 7:1. A 32 px red "Not live since 8:14
  AM" strip shows when the connection drops. Against burn-in the whole board
  steps 2 px on every page turn (once a minute when nothing turns), and the
  idle screen walks its clock. The Today mode shows the jobs whose install
  date is today, from the Week view. **On a phone** (0.9.0, PLAN 20.3:
  under 760 px wide, or a touch screen held upright) the board becomes one
  column of the same job cards, full width, scrolling like a page: every
  line of every job (no "+N more"), no paging, rotation bar, dots, or 2 px
  shift, card titles 18 px and lines 16 px with nothing under 14 px, the
  same theme and progress line and amber band. A slim sticky header reads
  "Board", the mode, and Live or "Not live since 8:14 AM", clear of the
  notch and the home bar. It stays read-only; a signed-in person who is not
  the Board account gets one "Open in Loadout" link per card (the Pull
  screen, or the job page for a role that does not pull). A resize or a
  turn of the phone switches layout. `&layout=tv` or `&layout=phone` forces
  one for checking.
- **Shelf** (Stock and Units, one screen since 0.8.0): the catalog with
  search (brand, model, UPC, box label, and now a unit's serial or MAC),
  sorting, a Columns manager, and tabs for All, Low (with Reorder), Out with
  people (the old Units, Out list: same columns, Check in and Nudge), and
  Locations. **Filters** (0.9.1, PLAN 21.1) narrow All and Low by what a
  product is: Category (the product's own category, such as Network or
  Cable; a blank one falls under its kind, such as Patch cables), Type (the
  sheet's Type, narrowed to the category picked), Brand, and Location (stock
  there, or the default location for a product with none), plus Consumables
  only (wire boxes with feet left). Each option shows its count and only
  values that exist appear; case and extra spaces do not split a category or
  a brand. On a wide screen they sit in one row above the table; on a phone
  a Filter button beside search ("Filter, 2") opens them in a sheet whose
  confirm reads "Show 12 products". Active filters show as chips under the
  search, each removable, with Clear filters. They last until the page
  reloads and never go in the address. Out with people and Locations keep
  their own lists. A product with serialized units lists them in place under its name:
  serial or MAC (last six; the full value is on the unit), where it is or who
  has it, since when, Check in or Check out, and Open unit. All units opens
  the full Units list (`#shelf/units`). A product or location row opens in place under itself: fields in
  two columns, on hand by location, boxes, and one row of buttons (Save,
  Receive or Receive a box, Pull for job, Move, Count, Adjust, Serialize,
  Reorder, Print label, Show history); the Scan card shows the first of the
  same buttons, in the same order. **Locations** (0.11.1, PLAN 28.2): New
  location (admin and warehouse) adds a shelf, bay, van, or vehicle; the
  Kind select says what each kind changes (a bay holds one job's staged
  product and is never pulled from, a van is never pulled from, a shelf,
  vehicle, or other is). An admin has **Rename** on a location's panel: area
  and shelf, with the name they make shown as it will print. The id (the
  label code) never changes, so a printed label still scans; the readable
  name is rewritten on stock rows, units, wire boxes, products that use it as
  their default, and the staging bay named on open jobs and open job names,
  in batches of at most 400 with one `edit` movement ("Location renamed:
  Storage room, Shelf B to Storage room, B3, 14 records"), using the same
  runner as Brands and categories (progress, Run it again, needs a
  connection). Past movements keep the old name. A name another location
  has (case and spacing ignored) is refused with "Another location already
  has that name." When it is done the panel offers **Print a new label**.
  **Archive** (admin) works only on an empty location that is no job's
  staging bay; it leaves the pick lists (pull sources, Receive targets, a
  product's default location, every location select), the Audit list, and
  the Shelf Location filter, and still names itself wherever history shows
  it. **Show archived** on Shelf, Locations lists them again, with
  **Unarchive**. **History** (0.9.1, PLAN 21.3) reads as a
  timeline everywhere it shows (a product, unit, or location's Show history,
  the Timeline on a job and a PO, Last movements on the Scan card): newest
  first under Today, Yesterday, and dated headings, a rail with a dot per
  event colored by family (green into the shop, blue toward a job, amber
  corrections, red write-offs, grey edits), the verb as the heading
  (Pulled, Received, Brought back), one sentence, the time and who, and the
  signed quantity at the right ("-4", "+100", "-180 ft"). A unit's history
  opens on where it is now. The latest 40 show first; Show older adds 20. One is open at a time, marked by a blue
  bar down its left edge; Escape or the chevron at its top right closes it,
  and the address carries it
  (`#shelf/p/<id>`, `#shelf/l/<id>`), so a link lands on it open. Modals stay
  for the decisions that need a confirm. **Brand and Category** (0.11.0,
  PLAN 25), on New product and the product panel, are pick lists: a field
  with a list under it (a combobox: arrows move, Enter picks, Escape closes,
  44 px options on a phone). Typing narrows the values already in use, each
  with its product count; matching ignores case and extra spaces, and
  leaving the field puts a match in the list's spelling. An admin who types
  something new gets "Add 'middle atlantic' as a new brand" and a small
  confirm with the name tidied ("Middle Atlantic": a word all lower case, or
  all upper case and longer than four letters, gets a capital first letter;
  capitals inside a word and short codes such as QSC stay; of, and, the stay
  lower case inside a name), to correct before Add. Typing a new value and
  pressing Save opens the same confirm. Anyone else sees "Not on the list.
  Ask an admin to add it." and Save refuses that field with the same
  sentence under it, keeping the rest of the form; clearing the field saves.
  Brand may be empty; Category glows amber on New product until it is set.
  **Type** keeps its text field and suggests the types already used in the
  category picked (any type can still be typed). `kind` is unchanged and
  stays internal.
- **Scan**: point the phone at a UPC or a Loadout label, or type the code.
  Shelf labels set the active location; box labels open the box sheet (mark
  now, cut this time, quick -50 / -100 / -250, Empty, recount); unit labels
  show who has it with Check out and Check in. Product and unit cards have
  Pull for job, the box sheet a For job chip, and a bay's label shows
  the job staged there. The QR on a printed pull sheet (0.9.0,
  `loadout:job:<id>`) opens that job's Pull screen, or the job page for a
  role that does not pull. On a phone or tablet, a label that explains itself
  has a ? beside it that opens the explanation (a mouse shows it on hover).
- **Units** (Shelf, All units; called Items before 0.6.0): every serialized unit, with Out as
  the Friday list, and a search that finds a unit by serial, MAC address
  (typed with colons, dashes, or none), product, or who has it. Serial and
  MAC address are columns, on by default and sortable. A unit opens in place
  the same way (`#shelf/units/i/<id>`), with its label, serial, MAC address,
  condition, Check out, Check in, Move, Retire, and Show history. A serial or
  MAC typed on Scan opens its unit.
- **Office** (More and the Console, one screen since 0.8.0): a card per
  section, each with a one-line why: Orders and tracking (Orders, Tracking,
  and Week as tabs), Clients (clients and the job names under them), Reports,
  People, Settings, Audit, Labels, Movements, Import inventory sheet,
  Backups, Export everything, and About. Admins see them all; warehouse sees
  Orders and tracking, Audit, Labels, Movements, and About; techs see Labels,
  Movements, and About, under a tab that reads More for them (0.10.0); accounting sees Reports, Backups, Export everything,
  and About. A section opens the same screen as before, under Office
  (`#office/<section>`). **Reports**,
  each with a From and To date (this month by default, with This month and
  Last month buttons), a sortable table with the Columns manager, a one-line
  total, and Export CSV / Export XLSX of the rows and columns shown: Stock on
  hand (by product and location, category, or location, with value at last
  cost when costs are on), Spend (POs marked ordered, by vendor and month),
  Delivered (every Deliver to site, by delivery or by client and job), Units
  out (who held which unit and for how long), Wire usage (box cuts by cut, job,
  person, or both), Movements (the raw trail for the range, filtered by type
  and person), and Aging (open jobs, open POs, and arrived-not-received
  shipments in age bands). Reports read the range fresh from the database, not
  the latest-500 list. The **Job report** (0.10.0, PLAN 23) sits beside
  Delivered and has no date range, since a job is whole: one search finds the
  job by client, job name, job number, or proposal number, with the latest
  twenty listed under it (the last job opened stays for the session). Then a
  header block (client, job, proposal, bay, install date, status, who pulled,
  picked up, and delivered, with dates) and one row per pull sheet line:
  room, product, brand and model (in Columns), needed, pulled, staged,
  picked up, delivered, brought back, still to order, the PO and its status,
  and with Show costs on the unit cost and line total. Serialized units
  (serial or MAC and where each is now) and the boxes wire was cut from sit
  under their line. A totals row closes the table, and with costs on the
  sentence under it gives the product value needed, delivered, and still
  out. Views: Every line, Only what is not delivered yet, Only what was
  ordered; sort, Columns, Export CSV and XLSX (units and boxes as their own
  rows with the line's key repeated), and Print. `#office/reports/job/<jobId>`
  opens it on a job, and the job page has **Open as a report** for admin and
  accounting. **People** (admin): confirm newcomers, change a role
  (including the wall board TV's Board account), deactivate or reactivate.
  **Settings** (admin): show costs, QR threshold, week start, the Work week
  default for the Week view, label sheet, box start lengths, carriers,
  vendors, the Portal tier, and the wall board (mode, rotation, grouping,
  theme, picked lines, pinned jobs), all saved by one button. Settings also
  links to **Brands and categories** (0.11.0, admin, `#office/lists`; no card
  of its own on Office), and (0.11.1) has a **Locations** line, "Shelves,
  bays and vehicles are managed on Shelf, Locations", with a link there.
  Brands and categories has the two lists with name and product count, sortable
  with the Columns manager, one search over both, cards under 720 px, and
  Add a brand or Add a category. At the top, **Probably the same** lists a
  value saved more than one way that differs only by case or spacing, and a
  weaker **Look alike** group (punctuation, spaces, or a trailing s, such as
  Rack and Racks); each has Merge into one with the spelling to keep.
  **Rename** (the new name tidied and editable; the sheet says how many
  products change, and a name already on the list merges the two) and
  **Merge into...** (pick the entry to keep) rewrite `brand` or `category`,
  and the readable `name` when it carries the brand, on every product with
  the value, in batches of at most 400 writes, then the lists document and
  one `edit` movement ("Brand renamed: Iport to iPort, 3 products"). Ids
  never change, and other records keep the product name they were written
  with. Progress shows while it runs; if it stops part way it says how many
  were done and offers Run it again, which only touches products still
  carrying the old value. Both need a connection, and say so when offline.
  **About**:
  the data dictionary for every collection, rendered from `DATA_DICTIONARY`
  in the code, with the readability rules. **Export everything**: every
  collection as one workbook or as zipped CSVs, file names stamped with the
  date and time. **Backups** (0.6.1): the nightly copies loadout-worker
  writes to the project's Storage bucket, newest day first with a status
  line from `loadout_settings/worker` (the last run's time in UTC, file and
  row counts, or the last error); a day opens in place to its 18 CSVs with
  their sizes and Download links. The first 30 days show, then Show older.
  The list comes straight from Storage, so it needs a connection.
  `#office/backups` opens it. Accounting sees Reports, About, Export, and
  Backups with no edit controls at all. **Movements**: the log with filters,
  Previous / This / Next week buttons, and CSV. **Clients**: clients and job
  names (add, edit, archive; a job name can reserve a staging bay).
  **Labels**: label sheets (Avery 5160 or 2 x 4). Settings, at the end of
  the wall board part, also has **Open the demo board** (`?demo=1&board=1`),
  to show the TV screen without signing a TV in. Office also carries the Add
  to home screen card until it is dismissed on that device. **This phone**
  (0.8.1, `#office/phone`, every role) never goes away on a phone or tablet:
  the install steps for the browser in hand, and Show the tip again once the
  strip or the card was dismissed. Since 0.9.1 it is not listed on a
  computer, and `#office/phone` there lands on Office.
- **Old addresses**: every link an older build printed or bookmarked still
  opens: `#tickets`, `#ticket/<id>`, `#stock/...`, `#items/...`,
  `#more/...`, and `#console/...` land on the 0.8.0 screen and the address
  is rewritten to `#jobs`, `#job/<id>`, `#shelf/...`, `#shelf/units/...`, or
  `#office/...`. The 0.8.0 screens are `#home`, `#pull`, `#pull/<jobId>`
  (0.9.0), `#pickup`, `#pickup/<jobId>`, `#deliver`, `#deliver/<jobId>`,
  `#receive` (0.9.0), `#audit`,
  `#audit/<locationId>` (`#count` lands there too), `#shelf/out`, and
  `#shelf/locations`.
- **Offline**: Loadout opens and works with no signal once it has been opened
  online on that device. Every change saves on the device first; the sync
  pill in the header reads Synced, Offline, or "3 pending" (changes waiting
  for the server), and a row changed while offline carries a small dashed
  "pending" chip until the server has it. The first change made offline says
  "Saved on this device. It syncs when you are back online." Scan works
  offline too: the camera, the zxing fallback on iOS, and lookups against what
  the device already holds. A change the server refuses later toasts and the
  row goes back to what it was. When a new release takes over a page that is
  still open, a "New version available, reload" toast offers a Reload button.
- **Desktop**: tables keep their header row in view under the app header on
  a long list, and show a sort arrow on hover; Edit columns opens a small
  panel under its button instead of a dialog; an empty list says so inside
  the table under its headers, with the next step. Forms put two fields side
  by side from 900 px up and one below; the first field takes focus, Enter
  saves a form that has one text field, and a required field that is not a
  choice says "required". `/` jumps to the view's search field.
  **Tooltips** (0.11.1, PLAN 27): every button carries a hover sentence on
  what it does and, for anything that removes, ends, writes off, archives,
  retires, cancels, or signs out, what is lost and whether the app can undo
  it. They come from one table in the code (`TIPS`, keyed by action) as the
  button is drawn; a button that builds its own, more specific sentence from
  live data keeps it. Plain Cancel, Close, Back, Done, Next, and Keep working
  carry none, and the X buttons keep their label for screen readers.
- **Photos**: a product's panel (Shelf, open a row) has a Photo slot with Add
  photo, Replace photo, and Remove photo for admin and warehouse. The photo
  is shrunk to 1200 px and saved as JPEG before upload, and shows on the Scan
  product card and in an optional Photo column (off by default; turn it on in
  Columns). Adding or removing a photo needs a connection. **Photo from a
  UPC** (0.10.0, PLAN 21.4): the moment a UPC goes onto a product (Scan's
  Set UPC and Link to a product without a UPC, the UPC field on the panel,
  New product), the UPC is saved and then one sheet, **Photo for this UPC**,
  asks loadout-worker what the free public lookup knows. It shows the name
  and brand the lookup found beside the product's own name, a plain warning
  when they share no brand or model word of four letters or more ("The
  lookup calls this ...; check that it is the same product."), and up to
  four photos as a radio group, the first picked. With no photo on the
  product the buttons are **Use this photo** and **None of these**; with one,
  the current photo sits beside the chosen one and the buttons are **Keep
  the current photo** and **Replace it with this one**. Nothing found, the
  lookup busy (the free lookup allows 100 a day, shared, so "The lookup is
  busy. Try again later." is normal), unreachable, offline (nothing is
  queued), or a role that cannot look up each get one line and Close. A
  chosen photo goes through the same upload as a camera photo (1200 px,
  `loadout/products/{id}.jpg`, the same Storage rules), never linked from a
  retailer. A product that already has a UPC has **Find a photo** on its
  panel (admin and warehouse), which always asks; the automatic sheet does
  not come back for a UPC it has an answer for. After an inventory import
  that gave products a UPC, the done box offers **Review photos for N
  products**, one sheet at a time with **Skip the rest**. A muted line on the
  sheet says the photos come from a public product lookup and are for use
  inside Loadout. The photo is fetched with the person's sign-in and shown
  from a blob, so nothing else can load it.

Roles: the account named in the rules as the project owner becomes admin on
its first sign-in; everyone else lands as Tech until an admin changes the role
under Office, People. Warehouse and admin change stock, audit shelves, and build,
pull, and close jobs; techs scan, check out, check in, record box readings,
and stage, pick up, and deliver job lines; accounting and board only read.
The role shows under the name in the header (0.10.0), and the Account sheet
says in one sentence what it can do. Only admin and warehouse can look a
photo up from a UPC; the worker checks the role on the roster itself.

### Demo mode

`?demo=1` opens the app on invented sample data with no sign-in. Every write is
refused with a "Demo mode: not saved" toast (the refused batch stays on
`window.Loadout.state.lastOps` for checking by script); since 0.8.0 the
Pick up, Confirm a delivery, and Audit screens still show their done state,
marked "Demo mode: nothing was saved", so the flow can be walked end to end.
`?demo=1` opens on Home with the doors. `&role=tech`,
`&role=warehouse`, `&role=accounting`, or `&role=board` shows that role's
view (`&role=accounting` reads everything and changes nothing); `&costs=1` turns Show
costs on so the reports show values; `&board=1` opens the wall board (`&mode=today`, `&mode=pinned`, or
`&mode=all_open` overrides the saved board mode on that screen); `&empty=1`
loads no jobs or orders, for the
empty states and the board's idle screen; (0.6.1) `&backups=error` shows the
Backups tab after a failed night, `&backups=many` gives 45 days so Show older
appears, and `&backups=empty`, `&backups=denied`, and `&backups=offline` show
those states (the plain demo has three days, the oldest one stopped at 9
files, and its Download links are dead `#` links marked Demo); `&print=1` opens a label sheet
preview. The New job sheet has a **Use the sample file** button (a made-up
proposal file) in demo mode only. 0.10.0: Photo for this UPC answers from
three fixture UPCs with no network call: the Ubiquiti U6-Pro's
(810010074409) finds four drawn pictures marked "Demo photo", so Find a
photo on it shows Keep versus Replace; the Leviton keystone's
(078477581138) finds two under another brand's name, so the mismatch
warning shows with Use this photo and None of these; the CAT6 riser's
(612825120034) and any other code find nothing. `&upc=busy` and
`&upc=offline` show those two states. Choosing a photo hands the refused
write (the photo fields and `photoSource: "upc"`) to the demo hook. The
Import done box shows in the demo too, so Review photos can be walked.
Job #1042's wire line carries the box cut from A1026, so the Job report
shows a box under a line. The fixture has four purchase orders (a draft with no
vendor, a partial one with two shipments, one ordered with a late shipment,
one received), install dates across this week, and imported rows that show the
0.3.0 name fixes. 0.5.1 adds two POs drop-shipped to job sites (three boxes on
the client side for two clients, one late, one out for delivery, and one
already arrived at the site), a draft PO 7739 with its vendor picked for
trying Mark ordered, unit costs on the ordered lines, status logs with clock
times on the newer shipments (the older ones read through the migration), and
job #1056, made by Zapier from Portal and still flagged for review. 0.8.0 adds job #1058, picked up by Tech (two lines in the van, one still in
Bay 3), job #1061 with lines to pull, seven open jobs pinned to the board so
it turns to a second page, and two locations with an audit date (Warehouse
over 60 days ago, so it reads amber) while the rest were never audited.
0.9.0 pulls job #1056's keystones, so it sits under Waiting on orders on
the Pull list, and adds PO 7740, a restock box that arrived this morning
with two UDM-SE gateways (over the QR threshold, so Receive asks for their
serials or MACs) and 50 keystones; job #1058 is the one to try Bring back
and the Close job van rule on. `&board=1&layout=phone` (or `layout=tv`)
forces the board's phone or TV layout. 0.4.0 adds costs on the catalog, a closed job and four
more POs from last month and this month (one still open and backordered), and
the deliveries, box cuts, and check-outs around them, dated inside this month
and last month so every report has rows on any day, plus a roster with Lead
tech, Accounting, Board TV, and a deactivated Former tech. 0.5.0 gives the
Ubiquiti U6-Pro and the Sonos Amp a drawn placeholder labeled "Sample photo";
Add, Replace, and Remove photo answer with the usual "Demo mode: not saved".
The demo hook adds `window.Loadout.sync({online: false, pending: 3})` to drive
the sync pill (`sync(null)` goes back to Demo),
`window.Loadout.pending("products", id, true)` to put the pending chip on a
row, `window.Loadout.install("prompt" | "ios" | "menu" | "none")` to pick
which Add to home screen card shows (0.8.1: the address takes it too,
`?demo=1&install=ios#office/phone`, plus `install=home` for the already on
the home screen state), and (0.5.2) `window.Loadout.exportTables()`
to read the Export everything tables without downloading, and (0.6.0)
`window.Loadout.boardRotate(6)` to set the board's rotation for watching the
scroll and the 2 px shift. 0.11.0 adds `window.Loadout.lists` (`normKey`,
`tidyName`, `brandList()`, `categoryList()`, `listSpell(f, s)`, and
`importOps()` for the loaded workbook) and `window.Loadout.state.demoLog`,
the last 50 refused batches, so a Rename or Merge run in batches can be read
back whole. A brand or category added through the confirm stays on this
tab's lists until reload. 0.5.2 adds a Short
line with stock elsewhere (job #1053 needs 80 keystones; 64 are on the
shelves and 24 ride in Van 1, which a job never pulls from, so 16 are
Short), a draft started with no connection (no PO number until Mark ordered
numbers it), and PO 7738 with an office box out for delivery, so every
shipment state shows. `sync({online: false})` also makes the demo act offline
for numbering: a new PO becomes a draft with no number, and Mark ordered on it
says "Connect to assign the PO number". No Firebase code loads in demo mode. The
service worker does register in demo mode, since the demo is how the offline
shell is checked.

## On the phone

Loadout is laid out for one hand: a tech holding a box in one hand and the
phone in the other. Everything you press sits in the lower half of the
screen, where the thumb already is.

- **The tab bar** along the bottom: Home, Jobs, Scan, Shelf, Office. Scan is
  the raised button in the middle. Nothing on a page ends up hidden behind
  the bar; the page always scrolls far enough.
- **Every dialog is a sheet that slides up from the bottom.** The button that
  does the job is the last one, full width, right above the bar; Cancel sits
  above it. The body scrolls between the title and the buttons, so the
  confirm button never moves off screen. Swipe the handle at the top down, or
  tap it, to close; Escape on a keyboard does the same. A tap on the dimmed
  page above does nothing, so a stray thumb never throws away what was typed.
- **Cards, not tables.** Each row of a list is a card. Its buttons sit at the
  bottom of the card: at most two, the likely one first and blue, the rest
  under the **...** button, which opens them in a sheet.
- **Filters fold away.** A list with filters shows one Filters button (it says
  how many are on); the filters open in a sheet with Clear filters and Done.
  Search fields stay on the page and have their own clear button.
- **The header shrinks** to 48 px once you scroll, and messages appear just
  under it, never behind the notch.
- **Scan** gives the camera as much of the screen as it can, with the type-it
  field right under it and the result card peeking above the tab bar. The
  box sheet keeps -50, -100, -250, Empty, and Save cut in the bottom bar.
- **Typing**: number fields open the number pad; fields use 16 px text so the
  phone does not zoom in; dates use the phone's own date picker.
- **Reading**: card text is 15 px, small grey text 13 px, nothing smaller; every
  button is at least 44 px tall with 8 px between neighbors. A field whose
  reason is not obvious has a ? that opens the reason.
- **What do these do?** (0.11.1): a phone has no hover, so a row of two or
  more buttons with tooltips (a card's footer, a panel's buttons, the job
  page header, a Tracking card) ends with this link on its own line. It
  opens a sheet named for the row with each button and its sentence; Close
  only. Confirm sheets, the tab bar, and the doors do not get one.
- **On its side** the full desktop menu shows, the header scrolls away with
  the page, sheets put their buttons in one row, and Scan puts the camera and
  the result side by side.

## Install on a phone

Open Loadout once with signal and sign in, then add it to the home screen. It
opens on Home, full screen, and keeps working in the warehouse with
no signal.

- **Android (Chrome)**: tap **Add to home screen** on the card under Office, or
  on the strip that shows once under the header. Chrome asks to confirm.
  Without the card, use the Chrome menu and pick **Add to Home screen** or
  **Install app**.
- **iPhone or iPad (Safari)**: tap **Share** (the square with the arrow) in
  Safari's toolbar, scroll down, and tap **Add to Home Screen**. The card under
  Office shows the same two steps.

The whole home-screen feature (the strip, the card, and Office > This phone)
is for phones and tablets only (0.9.1): a desktop or laptop browser never
shows it, even when Chrome or Edge offer their own install. The card and the
strip each go away on that device once dismissed. Office > This phone
(0.8.1) is for every role and never goes away on a phone: it shows the same
steps for the browser in hand, and **Show the tip again** brings the card and
the strip back. On a phone the sign-in screen says to sign in first, then use
Office > This phone: sign-in is a Google popup, and an app opened from the
iPhone home screen may not be able to finish it.
The first sign-in needs a connection; after that the phone stays signed in
and opens offline. Changes made offline go up the next time the phone has
signal with Loadout open.

## Data

The collection is still called `loadout_tickets` (and its `lines`
subcollection); since 0.8.0 the screens call a ticket a **Job** and its lines
the **Pull sheet**. Nothing was renamed in the database. 0.8.0 adds:

- `loadout_locations`: `lastAuditedAt`, `lastAuditedBy` (email),
  `lastAuditedByName`, written by Finish audit.
- `loadout_tickets`: `pickedUpAt`, `pickedUpBy`, `pickedUpByName` (the
  latest pick-up) and `deliveredAt`, `deliveredBy`, `deliveredByName` (the
  latest Confirm a delivery); `status` may now be `picked_up` (every line out
  of the bay, shown as Picked up), and `summary` gains `pulled`, `inBay`, and
  `pickedUp` for the progress strip.
- Ticket lines: `qtyPickedUp`, `pickedUpAt`, `pickedUpBy`, `pickedUpByName`,
  and `deliveryNote` (why an unticked line was not delivered, cleared when it
  is). In the van = `qtyPickedUp` minus `qtyDelivered`; in the bay =
  `qtyStaged` minus the larger of the two.
- Movement types: `pickup` (bay to a person's van, one per line) and `note`
  (a line not delivered, or a unit not found at an audit). An `adjust` with
  note "Audit" is an audit correction; `deliver` is unchanged and now means
  confirmed on site.

0.9.0 adds:

- Job lines: `broughtBackAt`, `broughtBackBy` (email), `broughtBackByName`,
  the latest Bring back of the line from a van. Bring back lowers
  `qtyPickedUp`, and `qtyStaged` too when it goes to a shelf, and writes one
  `move` movement per line ("Brought back from the van, job #N").
- A shipment's stored `status` stays `delivered`; the screens, reports, and
  exports call it Arrived (a carrier drop), and `deliveredAt` is when it
  arrived. The `poline` status `delivered` reads the same way.
- `loadout_settings/worker` (written by loadout-worker since 0.6.1, now in
  the data dictionary): `lastExportAt`, `lastExportFolder` (the day),
  `lastExportBucket`, `lastExportPrefix` (the day's path, as
  `loadout/backups/2026-11-11/`), `lastExportFiles`, `lastExportRows`,
  `lastExportPruned` (the dated folders deleted), `lastExportError` (empty
  after a good run), `lastExportErrorAt`, and `updatedAt`.
- The printed pull sheet's QR carries `loadout:job:<id>`.

0.10.0 adds, on `loadout_products` (PLAN 21.4):

- `photoSource`: where the current photo came from, `camera` (taken or
  picked on a phone or computer) or `upc` (chosen from the UPC lookup).
  Written with every photo from now on; photos from before 0.10.0 have none.
- `upcLookupAt`, `upcLookupResult`, and `upcLookupUpc`: when someone last
  answered Photo for this UPC, the answer (`used`, `none`, `kept`, or
  `not_found`), and the UPC it was about. The sheet does not open on its own
  again for the same UPC; Find a photo always asks. `upcLookupUpc` is the one
  field beyond the plan's list: without it "the same UPC" could not be told
  apart from a UPC that changed after the answer.
- Nothing else changes: New job writes the same ids and fields as 0.9.1 for
  the same input, and the Job report only reads.

Firestore project `watchtower-6fbe1`, collections `loadout_users`,
`loadout_settings`, `loadout_products`, `loadout_locations`, `loadout_stock`,
`loadout_containers`, `loadout_items`, `loadout_movements`, `loadout_clients`,
`loadout_jobs`, `loadout_proposals`, `loadout_tickets` with a `lines`
subcollection per ticket, `loadout_orders` with a `lines` subcollection per
purchase order, and `loadout_shipments` (field lists in PLAN section 3). Ticket ids are the
proposal number; line ids are the area plus brand and model, so a change
order re-import finds the line it changes. Settings hold `board` (the wall
board) and `importMap` (the saved CSV column mapping). Line quantities, all in
the product's unit: `qtyNeeded` from the proposal, `qtyFromStock` pulled off
our shelves, `qtyToOrder` what stock cannot cover, `qtyStaged` laid out in the
bay, `qtyPickedUp` (0.8.0) taken out of the bay into a van, `qtyDelivered`
confirmed on site. A ticket's `installAt` is the day it
installs (the Week view), and a ticket line's `orderLineRefs` names the order
lines that serve it. Order ids are the PO number (from 7701 up); order line
quantities are `qtyOrdered`, `qtyShipped`, and `qtyReceived`, and each order
line carries the ticket number and line it serves. A shipment carries its
carrier, tracking number and link, dates, and the lines with the quantity on
it and received. Received units carry `label` ("Sonos Amp #2"), `orderId`, and
`shipmentId`; receive movements carry `orderId`, `orderNumber`, and
`shipmentId`. Movements written by the inventory importer are dated from the
sheet's count date and keep `importedAt`, `importTab`, `importRow`, and
`importKey`, so a re-import skips what is already written. Every record
carries readable names next to its ids, so the
database and the export read without the app. Each person's table layout is
saved on their own `/users/{uid}` doc under `loadoutLayout`. Settings
`general` gained `workWeek` in 0.4.0. `loadout_settings/worker` is written by
loadout-worker after each nightly backup (`lastExportAt`, `lastExportFolder`
(the day), `lastExportBucket`, `lastExportPrefix`, `lastExportFiles`,
`lastExportRows`, `lastExportPruned`, `lastExportError`,
`lastExportErrorAt`); Office, Backups reads it. Products gained `imageUrl` (the photo's
download link), `imagePath` (`loadout/products/{id}.jpg` in Firebase Storage),
and `imageAt` in 0.5.0. In 0.5.1 purchase orders gained `shipTo` ("office"
or "client") and `shipToAddress`; order lines gained `unitCost`, fixed at
Mark ordered; shipments gained `shipTo`, `shipToAddress`, `note`,
`deliveredBy` and `deliveredByName`, and `statusLog`, a list of every status
change (`status`, `at`, `by`, `byName`, `note`) that Tracking reads the last
entry of. A shipment written before 0.5.1 has no log and reads its status with
the matching date; its first change seeds the log from its dates. Tickets
gained `reviewedAt`, `reviewedBy`, and `reviewedByName` beside the worker's
`needsReview`.

0.5.2 (audit-002):

- PO numbers come from `loadout_settings/counters` (`po`, the last number
  handed out, with `updatedAt`, `updatedBy`, `updatedByName`), read and bumped
  in one transaction with the PO it numbers, so two people never take the
  same number. On first use it starts from the highest PO in Loadout. A draft
  started with no connection has the id `draft-<random>` and an empty
  `number` until Mark ordered gives it one (online only); its id stays as it
  is, so its history and the ticket lines that point at it keep working.
- A new box is written with a create precondition: online, in a transaction
  that stops if the label exists; offline, the rules refuse a write that would
  replace another box (its `createdAt` may not change).
- Units carry `ticketNumber` and `clientName` beside `ticketId` and `jobId`,
  and boxes received for a ticket carry `pickTicketNumber`. A unit received
  on a PO takes the PO line's `unitCost` as its `cost` (the product's last
  cost only when the line has none), and the QR threshold reads the same cost.
- A ticket line's `qtyToOrder` is now a cache, rewritten with every
  warehouse save: needed minus staged minus what the shelves hold for that
  product (bays and vans left out) minus what open PO lines for that line
  still bring. The screens work the same sum out live and never read the
  cache alone.
- Movement types: `receive`, `pull` (shelf to a bay for a ticket), `move`
  (shelf to shelf, no ticket), `stage`, `deliver`, `cut`, `reading`,
  `adjust`, `checkout`, `checkin`, `return` (a unit back from a client's
  site), `writeoff`, and `edit`. Rows written before 0.5.2 keep what they say
  in the database (`pick`, `transfer`, `return` for close leftovers, `adjust`
  for write-offs and retirements); the app reads them as the new words.
- Export everything writes a shipment's `statusLog` as its own file,
  `loadout_shipments_status.csv` (shipment id first, one row per change), and
  its `lines` as `loadout_shipments_lines.csv` (one row per line); the
  shipments file no longer carries either. A ticket line's `orderLineRefs`
  reads as one `orderId/orderLineId; ...` column. Nothing in the export is
  JSON text any more.
- Each person's saved table layout (`loadoutLayout` on `/users/{uid}`)
  carries `updatedAt`; at sign-in the newer of the device's copy and the
  account's wins.

0.7.0 (the inventory sheet's pull tracking and serials):

- Units carry `mac` beside `serial`: `serial` as typed, for warranty claims
  and returns; `mac` stored as `AA:BB:CC:DD:EE:FF` so a networked device can
  be found on the client's network. Receive and Serialize ask for both, one
  per line, neither required; a unit's panel edits both.
- A unit pulled on the sheet is checked out to a name with no account:
  `holderName` as typed in Pulled For and no `holderUid`. It carries
  `holderNote` (the sheet's Note) and `clientId` with `clientName` (Client
  Pulled For); the next check-out or check-in clears them.
- Imported unit ids: `imp-{productId}-m-{12 hex}` for a row with a MAC,
  `imp-{productId}-s-{serial slug}` for a row with a serial, and
  `imp-{productId}-{n}` for the rest (unchanged). The sheet's Serial/MAC cell
  is kept as typed in `importNote` when it was read as a MAC.
- Products take `upc` from the sheet's UPC column; an empty cell never clears
  one. Clients named in Client Pulled For are created with the usual slug id.
- Locations gain the kind `vehicle` (a sheet Area ending in Car, Van, or
  Truck). It reads like `other`.
- Pulled units get one `checkout` movement by Import, dated from Pull Date
  (else the count date), with an `importKey` ending in `:checkout`.

0.11.0 (PLAN 25):

- `loadout_settings/lists` holds `brands` and `categories`, each an array of
  `{ name, key }`: `name` is the spelling shown and saved, `key` is the name
  trimmed, inner spaces collapsed, and lower case (`normKey`), the one key
  every comparison of a brand or category uses. Plus `updatedAt`,
  `updatedBy`, `updatedByName`. It is optional: a list is the values in use
  on products plus these entries, so the app works from products alone when
  the document is missing. It records the display spelling (otherwise the
  spelling most products use) and holds a value added before any product
  carries it. Only admins write it: an add appends with `arrayUnion`, so two
  admins adding offline both land; Rename and Merge write the whole array.
- `brand` and `category` on a product are saved in the list's spelling.
  Rename and Merge rewrite them, and `name` when it was built from the brand
  (or carries the old spelling), with `updatedAt`; ids never change, and
  stock rows, units, and lines keep the product name they were written with
  (names are snapshots). Each run writes one `edit` movement with no product
  and a note such as "Brand renamed: Iport to iPort, 3 products".
- The inventory sheet import writes brands and categories in the list's
  spelling, starts a new make tidied in the alias table, and appends new
  makes to `brands`. The proposal file reader writes a line's `brand` in the
  list's spelling. Ids and the re-import keys are unchanged.

Office, About lists every field of every collection.

## Rules

The block below is appended to `../watchtower/firestore.rules` (one ruleset per
project). It was tested in the local Firestore emulator (0.2.0 added the
ticket, stock, and board-settings rules near the end; 0.3.0 added the
vendor-list rule on `settings/general`, 36 of 36 checks passing, including
orders, order lines, and shipments as warehouse-only writes); it is **not
deployed**. 0.4.0 changed no rules: the Console writes only `loadout_users`
and `loadout_settings`, which were already admin-only (apart from the
warehouse carve-outs for board pins, the import mapping, and the vendor list),
and accounting and board appear in no writer list, so they read everything
and write nothing. 0.5.1 changed no rules either: the new fields on purchase
orders, order lines, and shipments fall under the wildcard (warehouse and
admin write, techs do not), and clearing a ticket's `needsReview` is a ticket
update a tech's carve-out (`status`, `summary`, `updatedAt`) does not allow.
0.8.0 (PLAN 18.7) lets a tech's ticket update also write `pickedUpAt`,
`pickedUpBy`, `pickedUpByName`, `deliveredAt`, `deliveredBy`, and
`deliveredByName`, and a tech's line update also write `qtyPickedUp`,
`pickedUpAt`, `pickedUpBy`, `pickedUpByName`, and `deliveryNote`, so a tech
can Pick up and Confirm a delivery. The `pickup` and `note` movements need
nothing new (any role from tech up creates movements under its own name),
and an audit writes stock, boxes, and `lastAuditedAt` on a location, which
warehouse and admin could already write. Not checked in the emulator yet and
**not deployed**; until it is, a tech's Pick up and Confirm a delivery are
refused and a warehouse or admin account can do both.
0.9.0 (PLAN 20.2) adds `broughtBackAt`, `broughtBackBy`, and
`broughtBackByName` to a tech's line update, and lets a tech raise (or start)
a stock count in a location whose `kind` is `bay`, which Bring back needs to
put counted units from a van back in the job's bay. A tech still cannot raise
a count on a shelf, so Bring back to a shelf is warehouse and admin. On
2026-11-11 this whole block ran in the Firestore emulator (`firebase
emulators:start --only firestore --project demo-loadout`) with a browser
script that replayed the exact batches the app writes: a tech's Pick up (13
writes), Confirm a delivery (9), and Bring back to the bay (9, one of them a
new bay count) were allowed; a tech raising or starting a count on a shelf,
bringing back to a shelf, or changing `qtyNeeded` was refused; a warehouse
audit (`lastAuditedAt` on a location, an `adjust` movement, the count) was
allowed; accounting writing a movement, a count, a location, a job, a job
line, or a product was refused. 14 of 14 checks passed, so the 0.8.0 tech
Pick up and Confirm a delivery rules below are now checked too (the 0.7.0
unit check-in fields were not in this run). Still **not deployed**.
0.7.0 adds `clientId` and `holderNote` to a tech's unit update: a check-out
or check-in clears them on a unit that came in pulled on the inventory sheet,
and only writes them when the unit has them. Not checked in the emulator yet
and **not deployed**; until it is, a tech checking in a pulled unit is
refused, and an admin or warehouse account can do it.
0.5.2 changes three things, checked in the local Firestore emulator on a
scratch port (34 of 34 checks passing): `loadout_settings/counters` (the PO
number) may be created and bumped by warehouse and admin, holding only `po`
and who took it, and `po` only goes up; a warehouse or admin write to a box
may not change its `createdAt`, so a box write never replaces another box;
and a tech's unit update may also write `ticketNumber` and `clientName`
(Deliver to site and check-in), and a tech's box update `pickTicketNumber`.
**Not deployed.**
The owner of the Firebase project deploys it from `work/watchtower` with:

`firebase deploy --only firestore:rules --account frank@umbrellaautomation.com --project watchtower-6fbe1`

```
// -------- Loadout (work/loadout) --------
// Shop inventory. Shares THIS project's login like Backup Audits and
// Sundial. Data lives in loadout_* collections shared by everyone on
// the domain; what differs per person is the role on
// /loadout_users/{uid}: admin, warehouse, tech, accounting, board.
// Accounting and board appear in no writer list, so they only read.
// A signed-in account with no roster doc counts as tech; a paused one
// (active == false) counts as 'none' and only reads.
//
// Firestore allows a request when ANY matching statement allows it,
// so the wildcard match at the end leaves out the collections that
// have their own rules here. Without that, a warehouse user could
// update the append-only movements through the wildcard.
//
// loadoutRole() reads one document. exists() and get() on the same
// path count once toward the per-request lookup limit, and every rule
// below calls loadoutRole() once (the update rules bind it with let).
function loadoutRole() {
  let path = /databases/$(database)/documents/loadout_users/$(request.auth.uid);
  return !exists(path) ? 'tech'
    : (get(path).data.get('active', true) == true ? get(path).data.get('role', 'tech') : 'none');
}
function loadoutAdmin()  { return isMSPAdmin() && loadoutRole() == 'admin'; }
function loadoutWriter() { return isMSPAdmin() && loadoutRole() in ['admin', 'warehouse']; }
function loadoutTech()   { return isMSPAdmin() && loadoutRole() in ['admin', 'warehouse', 'tech']; }
function loadoutOnly(keys) {
  return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys);
}
// techs may change the fields their scans touch, nothing else.
// 0.5.2: a unit also carries ticketNumber and clientName beside its
// ticket and job ids (PLAN 16 rule 3), so a tech's Deliver to site and
// check-in may write those two as well.
// 0.7.0: also clientId and holderNote, which a check-out or check-in clears
// on a unit that came in pulled on the inventory sheet.
function loadoutItemUpdate() {
  let r = loadoutRole();
  return r in ['admin', 'warehouse']
    || (r == 'tech' && loadoutOnly(['status', 'holderUid', 'holderName', 'jobId', 'jobName',
         'clientName', 'clientId', 'holderNote', 'ticketId', 'ticketNumber', 'ticketLineId', 'locationId', 'locationName',
         'checkedOutAt', 'checkedInAt', 'condition', 'updatedAt']));
}
// 0.5.2: a box write never replaces another box. A new box is written
// with createdAt, so a write that would land on a label another device
// already took (two people receiving offline) changes createdAt and is
// refused, instead of overwriting that box's feet and shelf.
function loadoutKeepsCreated() {
  return request.resource.data.get('createdAt', null) == resource.data.get('createdAt', null);
}
function loadoutContainerUpdate() {
  let r = loadoutRole();
  return (r in ['admin', 'warehouse'] && loadoutKeepsCreated())
    || (r == 'tech' && loadoutOnly(['ftLeft', 'lastMark', 'status', 'pickTicketId', 'pickTicketNumber',
         'lastReadingAt', 'lastReadingBy', 'locationId', 'locationName', 'confirmLocation']));
}
// a tech's cut or check-out moves the product's denormalized on-hand total
function loadoutProductUpdate() {
  let r = loadoutRole();
  return r in ['admin', 'warehouse'] || (r == 'tech' && loadoutOnly(['onHand', 'updatedAt']));
}

// Roster. A person's first sign-in writes their own doc as tech; the
// project's hardwired owner (backupsOwner() above, PLAN D2) may write
// it as admin. Everyone may refresh their own lastSeen and name;
// only admins change roles.
match /loadout_users/{uid} {
  allow read: if isMSPAdmin();
  allow create: if loadoutAdmin()
    || (isMSPAdmin() && request.auth.uid == uid
        && request.resource.data.email == request.auth.token.email.lower()
        && (request.resource.data.role == 'tech'
            || (request.resource.data.role == 'admin' && backupsOwner())));
  allow update: if isMSPAdmin()
    && ((request.auth.uid == uid && loadoutOnly(['lastSeen', 'name'])) || loadoutAdmin());
  allow delete: if loadoutAdmin();
}
match /loadout_settings/{key} {
  allow read: if isMSPAdmin();
  allow write: if loadoutAdmin();
}
// Audit trail: append-only, and each entry names its own author.
match /loadout_movements/{id} {
  allow read: if isMSPAdmin();
  allow create: if loadoutTech() && request.resource.data.by == request.auth.token.email.lower();
  allow update, delete: if false;
}
match /loadout_items/{id} {
  allow read: if isMSPAdmin();
  allow create, delete: if loadoutWriter();
  allow update: if isMSPAdmin() && loadoutItemUpdate();
}
match /loadout_containers/{id} {
  allow read: if isMSPAdmin();
  allow create, delete: if loadoutWriter();
  allow update: if isMSPAdmin() && loadoutContainerUpdate();
}
match /loadout_products/{id} {
  allow read: if isMSPAdmin();
  allow create, delete: if loadoutWriter();
  allow update: if isMSPAdmin() && loadoutProductUpdate();
}
// Pick tickets (0.2.0; the screens say Job since 0.8.0, the collection
// keeps its name). Tickets, their lines, clients, jobs, and proposals
// fall under the wildcard below (warehouse and admin write). These add
// only what a tech's Stage, Pick up, Confirm a delivery, and box cut
// for a ticket need. The board role is in no list, so it still only reads.
function loadoutTechOnly(keys) {
  return isMSPAdmin() && loadoutRole() == 'tech' && loadoutOnly(keys);
}
match /loadout_tickets/{tid} {
  // status and line counts are rewritten with every line change.
  // 0.8.0 (PLAN 18.7): a pick-up and a confirmed delivery also stamp
  // who and when on the ticket, and on the line how much is in the van
  // and why a line was left undelivered.
  allow update: if loadoutTechOnly(['status', 'summary', 'updatedAt',
    'pickedUpAt', 'pickedUpBy', 'pickedUpByName', 'deliveredAt', 'deliveredBy', 'deliveredByName']);
  // 0.9.0 (PLAN 20.2): Bring back lowers qtyPickedUp and stamps who and when.
  match /lines/{lineId} {
    allow update: if loadoutTechOnly(['qtyStaged', 'qtyDelivered', 'updatedAt',
      'qtyPickedUp', 'pickedUpAt', 'pickedUpBy', 'pickedUpByName', 'deliveryNote',
      'broughtBackAt', 'broughtBackBy', 'broughtBackByName']);
  }
}
// Pick up (0.8.0) and Deliver to site take counted units out of the bay: a tech may
// lower a stock count and change nothing else. 0.9.0 (PLAN 20.2): Bring back puts
// counted units from a van back into the job's bay, so a tech may also raise a count
// (or start one) in a location of kind bay, and nowhere else. Shelves stay with
// warehouse and admin through the wildcard below.
function loadoutIsBay(locId) {
  return get(/databases/$(database)/documents/loadout_locations/$(locId)).data.get('kind', '') == 'bay';
}
match /loadout_stock/{id} {
  allow update: if loadoutTechOnly(['qty', 'updatedAt'])
    && (request.resource.data.qty < resource.data.qty || loadoutIsBay(resource.data.locationId));
  allow create: if isMSPAdmin() && loadoutRole() == 'tech'
    && request.resource.data.keys().hasOnly(['productId', 'productName', 'locationId', 'locationName', 'qty', 'updatedAt'])
    && id == request.resource.data.productId + '__' + request.resource.data.locationId
    && request.resource.data.qty > 0
    && loadoutIsBay(request.resource.data.locationId);
}
// Warehouse may pin tickets to the wall board (Show on board) and save
// the CSV column mapping; the rest of settings stays admin-only above.
match /loadout_settings/board {
  allow create: if loadoutWriter()
    && request.resource.data.keys().hasOnly(['ticketIds', 'updatedAt', 'updatedBy', 'updatedByName']);
  allow update: if loadoutWriter()
    && loadoutOnly(['ticketIds', 'updatedAt', 'updatedBy', 'updatedByName']);
}
match /loadout_settings/importMap {
  allow write: if loadoutWriter();
}
// 0.5.2: the shared PO number counter. Warehouse and admin take the next
// number in the same transaction as the PO it numbers; it holds only the
// number and who took it, and it only goes up.
match /loadout_settings/counters {
  allow create: if loadoutWriter()
    && request.resource.data.keys().hasOnly(['po', 'updatedAt', 'updatedBy', 'updatedByName'])
    && request.resource.data.po is int;
  allow update: if loadoutWriter()
    && loadoutOnly(['po', 'updatedAt', 'updatedBy', 'updatedByName'])
    && request.resource.data.po is int
    && request.resource.data.po > resource.data.po;
}
// A vendor typed on a purchase order (0.3.0) joins the vendor list in
// settings/general. Warehouse may add to that list and nothing else
// there; the rest of general stays admin-only above.
match /loadout_settings/general {
  allow create: if loadoutWriter()
    && request.resource.data.keys().hasOnly(['vendors', 'updatedAt', 'updatedBy', 'updatedByName']);
  allow update: if loadoutWriter()
    && loadoutOnly(['vendors', 'updatedAt', 'updatedBy', 'updatedByName']);
}
// Everything else under loadout_* (stock, locations, clients, jobs,
// proposals, tickets, orders with their lines, and shipments): everyone
// on the domain reads, warehouse and admin write. Techs write none of
// the order collections; receiving is warehouse and admin. The prefix
// check keeps this from touching any other
// tool's collections.
match /{coll}/{docId} {
  allow read: if isMSPAdmin() && coll.matches('loadout_.*');
  allow write: if coll.matches('loadout_.*')
    && !(coll in ['loadout_users', 'loadout_settings', 'loadout_movements',
                  'loadout_items', 'loadout_containers', 'loadout_products'])
    && loadoutWriter();
  // subcollections (ticket lines, order lines). {rest=**} sits under a
  // named segment because a bare {sub=**} also matches zero segments,
  // which would re-match the parent documents and undo the exclusion above.
  match /{subcoll}/{rest=**} {
    allow read: if isMSPAdmin() && coll.matches('loadout_.*');
    allow write: if coll.matches('loadout_.*') && loadoutWriter();
  }
}
```

### Storage rules (0.5.0, backups 0.6.1)

Product photos live in Firebase Storage in the same project, under
`loadout/products/{productId}.jpg`. The rules are in `../watchtower/storage.rules`
(new in 0.5.0, holding only the Loadout block), and `../watchtower/firebase.json`
gained the matching `storage` entry. Admin and warehouse (read from the
`loadout_users` roster, the same way the Firestore rules do) may add, replace,
and delete a photo; anyone signed in with a verified `@umbrellaautomation.com`
account may read one. Each file must be under 2 MB and JPEG, PNG, or WebP, by
both its content type and its name. Tested in the local Storage and Firestore
emulators (25 of 25 checks passing: role, paused account, no roster doc,
outside account, unverified email, type, name, size at the 2 MB edge, other
paths, read, and delete); it is **not deployed**. Before the first deploy the
owner turns on Storage for `watchtower-6fbe1` in the Firebase console (the
default bucket `watchtower-6fbe1.firebasestorage.app` the app already names).
The first deploy of a rule that reads Firestore also asks to let Storage read
Firestore; answer yes. Deploy from `work/watchtower` with:

`firebase deploy --only storage --account frank@umbrellaautomation.com --project watchtower-6fbe1`

0.6.1 adds the nightly backups, `loadout/backups/YYYY-MM-DD/<collection>.csv`,
written by loadout-worker through its service account (which skips these
rules). `loadoutReader()` lets admin and accounting read them, reading the
roster exactly as `loadoutWriter()` does; nobody may write them from the app.
A list of the day folders is a list request one level up, on
`loadout/backups/`, which the per-file match does not cover, so a second
match allows only `list` there for the same two roles. Checked in the local
Storage and Firestore emulators: admin and accounting read, download, and
list both levels; warehouse, tech, an account with no roster doc, a paused
admin, an outside account, and a signed-out request get 403 on all of them;
nobody can write or delete. Not deployed; until it is, the Backups tab shows
its "Storage rules do not allow your role" message.

```
rules_version = '2';

// Umbrella Automation - watchtower-6fbe1 project
// Cloud Storage security rules.
//
// Only Loadout (work/loadout) stores files in this project so far: one
// photo per catalog product, and the nightly CSV backups loadout-worker
// writes. A path no block matches is denied, so nothing else in the
// bucket is reachable. A tool that adds files later adds its own block
// beside this one.

service firebase.storage {
  match /b/{bucket}/o {

    // -------- Loadout (work/loadout) --------
    // Same domain check as isMSPAdmin() in firestore.rules.
    function loadoutSignedIn() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email.matches('.*@umbrellaautomation[.]com');
    }
    // Admin and warehouse, read from the Loadout roster in Firestore. A
    // missing roster doc counts as tech and a paused one (active == false)
    // as nobody, exactly as loadoutRole() does in firestore.rules.
    function loadoutWriter() {
      let path = /databases/(default)/documents/loadout_users/$(request.auth.uid);
      return loadoutSignedIn()
        && firestore.exists(path)
        && firestore.get(path).data.get('active', true) == true
        && firestore.get(path).data.get('role', 'tech') in ['admin', 'warehouse'];
    }
    // Admin and accounting: the two roles that see the Console, where the
    // Backups tab lists the nightly files. Reads the roster exactly as
    // loadoutWriter() does.
    function loadoutReader() {
      let path = /databases/(default)/documents/loadout_users/$(request.auth.uid);
      return loadoutSignedIn()
        && firestore.exists(path)
        && firestore.get(path).data.get('active', true) == true
        && firestore.get(path).data.get('role', 'tech') in ['admin', 'accounting'];
    }
    // Product photos: loadout/products/{productId}.{jpg|jpeg|png|webp}.
    // The app shrinks a photo to 1200 px and uploads JPEG; the rule holds
    // the line at 2 MB and the three image types whatever the client does.
    match /loadout/products/{file} {
      allow read: if loadoutSignedIn();
      allow create, update: if loadoutWriter()
        && file.matches('[A-Za-z0-9_-]+[.](jpg|jpeg|png|webp)')
        && request.resource.size < 2 * 1024 * 1024
        && request.resource.contentType in ['image/jpeg', 'image/png', 'image/webp'];
      allow delete: if loadoutWriter();
    }
    // Nightly backups (loadout-worker 0.2.0): loadout/backups/YYYY-MM-DD/
    // <collection>.csv. Every collection is in them, the roster and costs
    // included, so only admin and accounting may read or list them. The
    // worker writes and prunes through its service account, which skips
    // these rules, so no one writes here from the app.
    match /loadout/backups/{day}/{file} {
      allow read: if loadoutReader();
      allow write: if false;   // only the worker writes, through the service account
    }
    // Listing the days themselves (the Backups tab's first call) is a list
    // one level up, which the match above does not cover: a list request
    // on loadout/backups/ is checked against loadout/backups/{day}. Only
    // list is allowed here; nothing is stored at that level.
    match /loadout/backups/{day} {
      allow list: if loadoutReader();
    }
  }
}
```

## Worker

`worker/` is loadout-worker, a Cloudflare Worker on the umbrella account. It
takes accepted Portal proposals from a Zap (PLAN section 6, T1) and writes the
proposal, the job, and its lines with the same ids the CSV import uses,
flagged `needsReview` until someone looks. Every night at 09:00 UTC it writes
one CSV per collection to this project's Storage bucket under
`loadout/backups/YYYY-MM-DD/` and deletes days older than 90 (PLAN section 16
rule 7); Office, Backups lists them for admin and accounting. It
writes through a service account, so the Firestore rules do not change and
the Storage rules only need to let the two roles read. The
Portal API intake (T2) is a stub until D1 is answered. Secrets, owner setup,
the Zap, and deploy steps are in `worker/README.md`.

## Changelog

### 0.11.1 (2026-11-11)

The owner hovered over Retire on a unit and got nothing. Of about 390
buttons, about 290 had no tooltip, Retire, Check in, Archive, and Receive
among them, so the only way to learn what a button did was to press it.
The owner also opened a door on the phone and could not get back, and asked
whether locations can be renamed.

- **A sentence on every button.** Hovering any button now says what it
  does and what happens next. Anything that removes, ends, writes off,
  archives, retires, cancels, or signs out also says what is lost and
  whether the app can undo it ("Retire: takes this unit out of service for
  good ... It cannot be brought back from the app"). The sentences live in
  one table, so a new button picks one up as it is drawn, and
  `Loadout.tipAudit()` lists any button on the screen that still has none.
  Plain Cancel, Close, Back, Done, and Next stay quiet.
- **What do these do?** A phone has no hover, so a row of buttons with
  tooltips ends with this link on its own line. It lists each button with
  its sentence.
- **A way back from every door.** Pull, Pick up, Confirm a delivery,
  Receive, and Audit start with a Home link above their heading.
- **Rename and archive a location** (admin). Rename changes the area and
  shelf on every record that shows the name, in batches, and keeps the
  label code so printed labels still scan; it then offers a new label.
  Archive takes an empty location off the pick lists and the audit list,
  and Show archived brings it back. Settings points to Shelf, Locations so
  people who look there find it.

No rules change: admin could already write locations (the `loadout_*`
wildcard lets warehouse and admin write them, `archived` included) and every
field the rename rewrites on stock rows, units, wire boxes, products, jobs,
and job names. Nothing to deploy for the rules.

### 0.11.0 (2026-11-11)

Brand and category were free text, so the same brand could be saved three
ways ("Sonos", "SONOS", " sonos ") and the Shelf filter, the Stock report,
and anyone reading the data saw it three times. They are now pick lists.

- **Pick or type.** On New product and the product panel, Brand and
  Category are a field with a list under it: typing narrows the values
  already in use, each with its product count, and case and extra spaces do
  not matter. Leaving the field puts a match in the list's spelling. Type
  keeps its text field and suggests the types already used in the category
  picked. Brand may stay empty (cables have none); Category glows on New
  product until it is set.
- **New values are an admin's call.** An admin who types something new
  sees "Add 'middle atlantic' as a new brand" and a small confirm with the
  name already capitalized ("Middle Atlantic") to correct before it is
  saved. Anyone else sees "Not on the list. Ask an admin to add it." and
  cannot save that value; the rest of the form is kept and the field can be
  cleared. This keeps the lists short and spelled one way.
- **One list everywhere.** The Shelf filters, the Stock report's By
  category view, the inventory sheet importer, and the proposal file reader
  all match the same way and write the list's spelling, so a file that says
  "SONOS" lands on "Sonos". Product ids, line ids, and re-imports do not
  change; a re-import no longer renames "Sonos Amp" to "SONOS Amp" because
  the sheet shouted. New makes from an inventory import join the brand list.
- **Tidy what is there.** Office, Settings, Brands and categories (admin)
  lists both with their counts, flags the ones that are probably the same,
  and has Rename and Merge into. Either one rewrites the value and the
  readable name on every product carrying it, in batches, with one line in
  the history; if the connection drops part way, running it again finishes
  the job without doing anything twice.

No rules change: admin could already write any document under
`loadout_settings`, and the new `loadout_settings/lists` is one of them.

### 0.10.0 (2026-11-11)

Five changes the owner asked for after walking the app by role.

- **A photo from the UPC.** Photographing a boxed switch that a retailer has
  already photographed is wasted time, so the moment a UPC goes onto a
  product Loadout now asks whether the public lookup's photo is the right
  one. A person always decides, the photo is copied into the shop's own
  storage like a camera photo, and a busy or missing lookup just says so;
  the UPC is saved either way. Products that already carry a UPC get Find a
  photo, and an inventory import that adds UPCs offers to review them one at
  a time. The lookup runs through loadout-worker 0.3.0, so it needs that
  deploy before it works outside the demo.
- **New job, made plain.** "Import a Portal CSV" lost the people who have
  never seen Portal or a CSV file. The sheet now says what a job is and
  offers two choices in plain words: make the list yourself (three short
  steps, with what the shelf holds beside each line) or use the proposal
  file the office sends. The column-mapping table only appears when the
  file needs it. What gets written is exactly what 0.9.1 wrote.
- **More for techs.** A tech's last tab holds labels, movements, this
  phone, and About, none of it office work, so for techs it now reads More.
  Everyone else still reads Office, and links are unchanged.
- **A report for one job.** Accounting could not see everything on one
  proposal, and the job page does not export. The Job report shows every
  line of one job with its units, boxes, PO, and costs, and exports or
  prints like the other reports.
- **Who is signed in, up top.** The role sat in the footer where nobody
  looked, and Sign out sat one stray tap from a pull. The header now shows
  the name and role, and Sign out moved into the Account sheet behind them.
  The Loadout mark at the top left now goes Home from any screen, the way
  people already expected it to.

No rules change: admin and warehouse could already write every product
field, and every role on the domain can already read job lines and units.

### 0.9.1 (2026-11-11)

Shelf holds 268 products, and the only ways to narrow it were a tab, the
Consumables button, and search. Someone looking for "the patch cables in the
storage room" had to know what to type. History drew the same four-column
rows everywhere, which read like a spreadsheet when the question is "what
happened to this, in order" (PLAN 21).

- **Shelf filters** (PLAN 21.1): Category, Type, Brand, and Location, each
  All by default, with Consumables only beside them. Category is the
  product's own category (Network, Cable, Wire), and a product with none
  falls under its kind; Type narrows to the category picked; case and extra
  spaces do not split a category or brand. Every option shows its count, so
  picking one shows exactly that many. One row on a wide screen; a Filter
  button beside search on a phone, with a sheet that says how many products
  it will show. Chips under the search remove one filter each, and Clear
  filters removes them all. They reset on reload, so a filter set last week
  never hides a product from the person looking for it, and Consumables
  only no longer rides in the address either.
- **History as a timeline** (PLAN 21.3): one component for a product, unit,
  or location's history, the job and PO Timeline, and Last movements on the
  Scan card. Day headings, a dot per event in its family's color, the verb
  as the heading, one sentence, who and when, and the signed quantity on the
  right. A unit's history opens on where it is now. Show older pages through
  long histories 20 at a time; the product, unit, and location history no
  longer stops at 25 and the PO Timeline no longer at 30.
- **The home-screen tip is for phones and tablets only.** Desktop Chrome and
  Edge offer their own install, which made the strip, the Office card, and
  Office > This phone show on a computer. A computer now sees none of them;
  `#office/phone` lands on Office, and the desktop "open this address on
  your phone" state is gone.
- **Home**: with five doors on a wide screen, Audit a shelf spans the full
  width instead of sitting alone at half width.
- Words: three leftover "on Stock" and "under Stock" strings and the
  Consumables tooltip now say Shelf.

### 0.9.0 (2026-11-11)

A walk through 0.8.2 as warehouse, tech, and admin on a phone found that the
doors were simple but two of the screens behind them were not, and that two
jobs the shop does every week had no door at all (PLAN 20).

- **Pull has its own screen.** Pick up and Confirm a delivery each opened a
  short list with one button; Pull opened the full office job page with nine
  buttons and five numbers per line. The new Pull screen (`#pull/<jobId>`)
  shows only what to take from each shelf, in the board's walking order, with
  one "Pull 4" button per line. What the shelves cannot cover waits in its
  own group with its PO, and what is pulled drops to "In the bay". Every Keep
  pulling button lands here, and a job with nothing pulled says Start
  pulling. The job page is unchanged for the office.
- **Product can come back from a van.** A postponed job used to leave stock
  stuck on a person, and Close job ignored it, so counts would drift on the
  first postponed job. **Bring back** on Out with me and on the delivery
  screen returns ticked lines to the job's bay (or, for the warehouse, a
  shelf). Close job now lists what is still in a van and will not close until
  it is delivered or brought back; only an admin can write it off there.
- **Receiving has a door.** Receiving was the only way stock got in and sat
  four taps deep under Office. **Receive a shipment** is now the fourth door
  for warehouse and admin ("2 arrived, 3 on the way"), arrived boxes first.
  A unit worth its own QR now asks for its serial or MAC when it comes off a
  shipment, which it never did before.
- **One word, one meaning.** "Delivered, not received" was a carrier's box at
  the shop, while Confirm a delivery was ours at the client. A carrier's box
  is now **Arrived** everywhere ("Arrived, not received", Mark arrived);
  Deliver means the client's site. Stored values did not change.
- **The progress line reads one number, not four.** "Pulled 2 of 9, Staged
  2" instead of "Pulled 2 of 9, Staged 2, Picked up 0, Delivered 0", and
  "Delivered 2 of 2" when a job is done.
- **The Pull door splits.** "3 jobs to pull, 2 waiting on orders", and the
  list puts the ones you can work on first.
- **The printed pull sheet has a QR.** Scan it and the phone opens that
  job's Pull screen, so a pull can start from the clipboard.
- **The wall board reads on a phone.** Opened on a phone it becomes one
  scrolling column with every line of every job at phone type sizes, and a
  signed-in person gets an Open in Loadout link per card. The TV layout is
  unchanged.
- **Leftover words.** Messages that still said More, the Console, Units view,
  or ticket now say Office, Shelf, and job.
- **Carried items.** The data dictionary now lists `loadout_settings/worker`
  and the new line fields, and the tech rules from 0.8.0 plus the new Bring
  back rule ran in the Firestore emulator for the first time (14 of 14
  checks). The rules are still not deployed.

### 0.8.2 (2026-11-09)

The owner looked at Zoho Inventory's home screen, which opens on counters
(to be packed, to be shipped, to be delivered), and wanted the same from
Loadout: see whether work is waiting behind a door before tapping it.

- **Counts on the doors**: the line under each door now starts with what is
  behind it. Pick up from staging: jobs with staged lines not yet picked up.
  Confirm a delivery: jobs in vans and jobs in the bay. Pull for a job: open
  jobs with lines still on a shelf. Audit a shelf: shelves, bays, and vans
  never audited or audited over 60 days ago. Each count is the length of the
  list the door opens, worked out from the same code, so the two always
  agree, and it moves as soon as the data syncs.
- **Nothing waiting reads quiet**: a door with nothing behind it says so in
  grey (Nothing staged, Nothing to deliver, Nothing to pull, All shelves
  audited). A count is white with the number in bold. No badges.
- The short why after the count (shelf to bay, bay to your van) drops on a
  phone when it would push the line to two; the longer when-to-use sentence
  is the door's hover tip now.
- A door's hover is a thin white ring instead of a lighter color, so the
  grey text keeps 4.5:1 on every door while the pointer is over it.

### 0.8.1 (2026-11-06)

The owner asked two things: is there a setting to add the icon in case
someone on an iPhone or Android phone has trouble, and does anything show on
the first visit before sign-in. Until now the strip and the Office card could
each be dismissed for good on a device, nothing brought them back, and the
sign-in screen said nothing.

- **Office > This phone**: a card for every role on every device that never
  goes away. It shows Add to home screen where Chrome offers its own dialog,
  the two Share steps on an iPhone, the browser menu steps elsewhere, and on
  a desktop the app's address with Copy address to send it to a phone. Once
  Loadout runs from the home screen it says so and nothing else.
- **Show the tip again**: on This phone, once the strip or the card was
  dismissed, brings both back on that device.
- **Sign-in screen**: on a phone or tablet, one line says to sign in first,
  then use Office > This phone. Sign-in stays first because it is a Google
  popup, and an app opened from the iPhone home screen may not be able to
  finish it.
- The demo takes `&install=ios`, `prompt`, `menu`, `none`, or `home` in the
  address, so each state of This phone can be seen.

### 0.8.0 (2026-11-05)

The first test drive on real data showed that Stock, Units, and the Console
were confusing. The shop does three jobs, really four: someone audits a
shelf, someone pulls product for a job, someone takes it out to the site, and
someone confirms it got there. So the app now opens on those jobs instead of
on data types (PLAN 18, option A, approved in simple-preview.html).

- **Home with doors**: Pick up from staging, Confirm a delivery, Pull for a
  job, and Audit a shelf, most used on top, each its own color, with the open jobs under them.
  The color repeats as a thin band on that job's screens, so it means the
  same thing everywhere. A tech's Home starts with what is out with them.
- **New words**: Ticket is now Job and its lines the Pull sheet, Stock and
  Units are Shelf, More and the Console are Office, and counting a shelf is
  Audit. The database keeps its names.
- **Pick up is its own step**: product sits in a van between the bay and the
  site, and someone should be on the hook for it, so Pick up (out of the
  bay, units checked out to you) and Confirm a delivery (on site) are two
  steps now, each with its own screen that ticks every line by default.
- **One button per job and per line**: every job card has a progress strip
  and one next step; every pull sheet line shows one button, the rest under
  the ... sheet.
- **Audit a shelf** is new: what should be on a shelf, confirm or correct
  each product, mark each unit here or not, read each box, finish.
- **Wall board grid**: six job cards at a time instead of one job cycling;
  it only turns pages when more than six jobs show.
- Old links and printed QR codes still open (#tickets, #stock, #more/...,
  #console/...). Firestore rules: a tech may write the pick-up and delivery
  fields (watchtower/firestore.rules, copied above). Not deployed.

### 0.7.0 (2026-11-05)

The shop's inventory sheet grew pull tracking and serials on the Devices tab:
a UPC, a serial or MAC, who a unit was pulled for and for which client, the
pull date, and a note. The import had to keep up so the test drive runs on
the real data, and the shop asked for the MAC on its own field, because for
anything on the network the MAC is how you find the device later, whether or
not the serial is known.

- **Import**: the Devices tab reads six new columns. UPCs land on products.
  A row with a serial or MAC becomes its own unit, with an id that a
  re-import finds again. A row with Pull Date or Pulled For comes in checked
  out to that name (no Loadout account needed), for the client named, with a
  Check out by Import; new clients are created. An Area ending in Car, Van,
  or Truck becomes a vehicle location. A row noted DNI/Does Not Exist keeps
  its product and counts nothing. The dry run shows units with serials and
  with MACs, pulled units (as counts of people and clients, no names),
  clients to create, products gaining a UPC, and vehicles.
- **Import twice, write nothing**: a record the database already holds is
  left out of the plan, so the same file a second time plans 0 writes.
- **Units**: serial and MAC address on every unit, as table columns, in the
  unit panel, on Receive and Serialize, in the Units out report, and in
  Export everything. A search box on Units finds a unit by either, and
  typing one on Scan opens it.
- **Storyboard 0.7.0**: a Test drive tab, 14 steps for one morning in the
  shop, with a printable "What felt off" table.
- Firestore rules: a tech's unit update may write `clientId` and
  `holderNote` (watchtower/firestore.rules, copied above). Not deployed.

### 0.6.1 (2026-11-03)

The nightly backup moves from Google Drive to the project's own Storage
bucket, and the Console gets a Backups tab to find it. The shop's Google
Workspace cannot make a Shared Drive, and a service account cannot upload
into a folder in someone's My Drive, so the Drive plan had nowhere to put
the files. The bucket that already holds product photos needs no new
account or sharing, and admins are already signed in to the app.

- **Console > Backups**, after Export everything, for admin and accounting:
  when the last backup ran (in UTC, the worker's clock), how many files and
  rows, or the error if the last night failed; then the days, newest first.
  A day opens in place to its 18 CSVs, each with its size and a Download
  link. The first 30 days show; Show older lists the rest. It needs a
  connection, and says so offline. Accounting gets the same tab: it has
  nothing to change.
- Storage rules: admin and accounting may read and list the backups; nobody
  writes them from the app (watchtower/storage.rules, copied above). Not
  deployed; until then the tab says the rules do not allow reading.
- loadout-worker 0.2.0 writes the files (worker/README.md). Still not
  deployed.
- No Firestore rule changes.

### 0.6.0 (2026-11-02)

The clean pass (PLAN 12c). Nothing new to learn; everything gets easier to
reach with one thumb, reads like one product on the desktop, and reads from
across the shop on the TV.

- On the phone every dialog is now a sheet from the bottom, with the button
  that does the job at the bottom, full width, and Cancel above it. Before,
  the confirm button sat at the top right of a dialog that could run off the
  screen, which meant two hands or a scroll for every pull and every cut.
  The sheet's body scrolls on its own, so Save is always in reach. A swipe
  down on the handle closes it; a tap outside still does not.
- Card buttons on the phone sit at the bottom of each card, two at most, the
  likely one first. A ticket line with five buttons used to wrap into a
  block of small ones; the rest are now under a ... button.
- Filters fold into one Filters button on the phone, so a list starts with
  the list, not with five dropdowns. Search fields gain a clear button, and
  Tickets gains a search.
- The header drops to 48 px as soon as you scroll, and messages show just
  under it. The tab bar puts Scan in the middle, raised, where the thumb rests.
- Scan's camera fills the screen above the result card. The box sheet keeps
  the quick -50 / -100 / -250 buttons and Save cut at the bottom, under the
  thumb. On a touch screen a sheet no longer pops the keyboard up over itself.
- Text on the phone is 15 px on cards and never under 13 px; number fields
  open the number pad (the Adjust field keeps the minus key).
- Desktop: one spacing scale and one corner radius across every view; table
  headers stay in view on long lists; Edit columns opens under its button;
  an empty list shows inside its table; forms go two-up only from 900 px;
  Enter saves a one-field form; `/` jumps to search; the open row in Stock,
  Units, and Locations has a blue bar and its chevron.
- The TV board is sized for four meters: 32 px lines, 48 px counts, nothing
  under 24 px. A long list scrolls at a steady 40 px a second with a pause at
  each end, the "Not live since" strip is 32 px with the time, and the board
  moves 2 px every rotation so a ticket left up all day does not burn in. On
  the light theme the counts now pass 7:1 for a bright shop.
- Details: one date format everywhere ("Nov 2" this year, "Nov 2, 2025"
  otherwise); "3 days ago" only next to the date it counts from; button
  labels are verbs (Edit columns, Print label, Open details, Show history,
  Mark reviewed); one word per thing, so Items is now Units and a label sheet
  picks locations, boxes, and units; the check mark on the board's staged
  lines is gone (the word Staged says it); nothing moves except sheets and
  panels opening (150 ms) and the board's rotation bar.
- No Firestore rule changes.

### 0.5.2 (2026-11-02)

The fixes from the second audit (audit-002, all 36 findings), so the app
says the same thing in every view, cannot lose a PO or a box to a second
device, and works for a keyboard, a thumb, and a tablet.

- A short line can now be ordered from its ticket. "To order" used to read a
  number saved when the line last changed, so stock taken by another ticket
  never made a line orderable and Order missing stayed off. It is now worked
  out live everywhere it shows: what the line still needs, less what the
  shelves hold (bays and vans do not count), less what open POs for that
  line still bring. The Tickets list, its filter, the ticket, the board, and
  Week all agree.
- One set of words and colors for every state, in every view, the board,
  Week, Tracking, and the exports. Lines read Pull, Staged ("Staged 2 of 4"
  when part of it is), Delivered, On order, or Short; "Picked" is gone, since
  it meant two different things. A box delivered and not scanned in reads
  "Delivered, not received" everywhere, instead of seven different phrasings.
  Delivered and installed are a green outline, closed, cancelled, and retired
  a grey one, so finished things no longer look like things in progress.
- Movement history uses one word per thing: pull (shelf to a bay for a
  ticket), move (shelf to shelf), return (a unit back from a client's site),
  write off. Older entries read in the new words without being rewritten.
- PO numbers come from one shared counter, so two people starting a PO at
  the same time, or one of them offline, can no longer take the same number
  and merge two orders. A PO started with no signal is a draft with no number
  until Mark ordered, which needs a connection. A new box label works the same
  way: if someone else already used it, Loadout says so and offers the next
  free one, rather than writing over their box.
- Every field, button, and chevron edge is dark enough to see (3:1 or
  better), and grey pills and links inside open panels pass 4.5:1, because
  a secondary button used to be found by its text alone.
- Keyboard: Tab stays inside an open dialog and focus goes back where it came
  from when it closes; the file pickers are real buttons; a Skip to content
  link starts every page.
- Phones in landscape and tablets get the same 44 px controls as a phone in
  portrait, and on any touch screen the "why" behind a field is a ? you can
  tap, since nothing there ever shows a hover tooltip.
- Units keep the cost on their PO line, so Items out and stock value match
  what was paid. Units and boxes carry the ticket number and client name, so a
  row reads on its own in the database and the export.
- Export everything gives a shipment's status history and its lines their own
  files, one row each, instead of JSON text in a cell.
- A saved column layout follows you: the newest change wins on every device.
- Smaller things: dates read "Nov 2" or "Nov 2, 2026" everywhere; "Mark
  backordered" and "Change ETA" say what they do; a deactivated person reads
  Deactivated, not Paused; "Low stock" everywhere; one "Receive a box" button;
  an error the rules cause says so instead of blaming the connection; the
  board's title carries the version; the link preview uses a full image URL;
  the label print preview fits a 360 px phone.
- The Firestore rules changed (the PO counter, the box guard, and two unit
  fields a tech's delivery writes); checked in the local emulator, not
  deployed.

### 0.5.1 (2026-11-02)

Tracking now answers "where is it" the way the shop asks it: what is coming
here, and what is going straight to a client.

- Tracking is split down the middle. Packages coming to the office are on the
  left; packages the vendor ships straight to a job site are on the right,
  grouped by client and job; the last 30 days of deliveries run along the
  bottom. Before, everything sat in one long table and a drop-shipped box
  looked like one waiting to be scanned in.
- Each package is a card with its current status and the time of that status
  ("Out for delivery, Nov 2, 8:14 AM"), so nobody has to open the carrier page
  to see whether today's box is on the truck. Late boxes say how late, in
  amber, and a box delivered here but never scanned stays at the top of the
  office side until someone receives it.
- A box sent to a job site has Mark delivered instead of Receive. It counts
  the lines as received on the PO and staged on the ticket without adding
  anything to the shelves, because the box never came through the building.
- Every status change on a shipment is now kept with who made it and when, so
  the history of a box reads in order, and a later carrier lookup can add to
  the same list. Older shipments show their last known status and date.
- Mark ordered asks where the order ships, office or the job's site, and a
  single shipment can be sent elsewhere when the vendor splits an order.
- Purchase order lines keep the unit cost from the day they were ordered.
  Spend and Delivered now use it, so last month's numbers stay put when a
  product's price changes.
- Tickets made by Zapier from Portal now say so, with an "Imported from
  Portal, review" chip on the list and the ticket until someone presses
  Reviewed. Every ticket names its source: CSV, Portal, or built by hand.
- Tracking links are a full thumb-sized target on the phone, on Tracking and
  on the order page, so tapping one opens the carrier page and not the card.
- A ticket line with many buttons no longer pushes the table past the edge of
  a laptop-width window: the buttons wrap instead.

### 0.5.0 (2026-10-29)

Offline use, the home screen, and photos, so the phone keeps working in the
corner of the warehouse with no signal and a new tech can tell one gray box
from another.

- Loadout now opens with no signal once it has been opened online on that
  phone. A service worker keeps the app, the iPhone barcode decoder, and the
  database code on the device, and the database already kept its own copy, so
  Scan, counts, cuts, and check-outs all work in a dead spot.
- Every change saves on the device first and goes up when there is signal.
  The pill in the header says Synced, Offline, or how many changes are still
  waiting, and a row changed offline carries a small "pending" chip until the
  server has it, so nobody wonders whether a count stuck. The first change
  made offline says so in a toast, once, instead of on every tap.
- Screens no longer wait on a slow connection before moving on: if the server
  has not answered in a couple of seconds the change counts as saved on the
  device. A change the server refuses later still toasts, and the row goes
  back to what it was.
- When a new release reaches a phone that has Loadout open, a toast offers a
  Reload button, rather than leaving the old version running all day.
- Add to home screen: a card under More (and once, a strip under the header on
  the phone) with Chrome's own install button on Android and the two Share
  steps on iPhone, because iPhones never offer it on their own. The home
  screen icon opens straight to Scan.
- Product photos: Add, Replace, and Remove in the product panel, a thumbnail
  on the Scan card, and an optional Photo column on Stock. Photos are shrunk
  to 1200 px and saved as JPEG on the phone first, which keeps uploads small on
  a weak signal and drops the camera's location data. The Storage rules keep
  photos to admin and warehouse for writing and the domain for reading.

### 0.4.0 (2026-10-29)

The Console, so the office can answer money and accountability questions
(what is on the shelves worth, what did we spend, what went to which job, who
has the gateway) without exporting the database and building the sum by hand.

- Seven reports with a date range that starts on this month: stock on hand
  and its value, spend by vendor and month, product delivered per client and
  job, items out, wire usage per job and person, the movement trail, and
  aging. Each sorts, keeps its column layout, ends with a one-line total, and
  exports to CSV or Excel, because the reports exist to be checked against
  invoices.
- Reports read the range straight from the database instead of the latest
  500 movements the app keeps live, so a month-end report is complete.
- Accounting gets the Console with no buttons that change anything, rather
  than greyed ones, so there is no doubt about what the role can do.
- People and Settings moved into the Console with the wall board settings,
  so the admin screens live in one place; More keeps links. Deactivate keeps
  a person's name on everything they touched.
- A shop-wide Work week default for the Week view, for anyone who has not
  chosen for themselves.
- About shows the data dictionary from the code itself, so the description
  of the database cannot drift from what the app writes.
- Export everything is in the Console, adds zipped CSVs beside the workbook,
  and stamps the file name with the date and time, so a weekly copy never
  overwrites the last one.

### 0.3.0 (2026-10-29)

Purchase orders, tracking, and the week, so "what is missing for Thursday"
and "where is that box" have answers without opening three screens, plus the
fixes from the first live run.

- Lines stock cannot cover go onto a draft purchase order from the ticket
  (Order missing, or Order on one line) or from the low-stock list (Reorder).
  The ticket then shows a chip per PO instead of "no PO yet", and Copy for
  Portal says what is on order and when it is due, because that is the
  question the office answers on the phone.
- Mark ordered asks for the vendor's order number, since that is what you
  quote when you call them. Shipments guess the carrier from the tracking
  number and link straight to its tracking page.
- Receive walks a shipment line by line, by tap or by scanning each UPC.
  What serves a ticket lands in its staging bay and counts as staged; the rest
  goes on a shelf. Units worth following get their own QR on the spot, so
  nothing expensive reaches a van without a label.
- Tracking lists everything on order and not received in one place. A box
  marked delivered but not scanned in floats to the top in amber, because
  that is the one sitting in a corner of the shop.
- The Week view lays the staging schedule out like a timesheet by install
  date, so the warehouse sees the week at a glance and what is short today.
  The wall board can follow it (Today mode), and Movements gained week
  buttons for "what moved this week".
- Products, units, and locations open in place under their row instead of in
  a modal, so you keep your place in a long list; the decisions (Receive,
  Adjust, Serialize, Check out) still confirm in a modal.
- Inventory sheet fixes from the first live run: "A/v" reads "A/V"; the
  sheet's stray hyphen spacing ("Cable- Black Band") reads as a comma in names
  while the type stays as typed, and a connector keeps its hyphen ("Edison-M");
  imported units are labeled "Product name #n" instead of the tail of an id;
  import movements are dated from the sheet's count date, with the import time
  kept beside it. Running the import again renames products and units in place
  and skips movements it already wrote.
- Warehouse may add a vendor to the list in Settings and nothing else there;
  the rules change was checked in the local emulator.

### 0.2.0 (2026-10-29)

Pick tickets, so an accepted proposal becomes a list the warehouse can pull,
stage, and send to site without retyping it, and the office can see how far
each job has got.

- A Portal proposal CSV becomes a pick ticket in one pass. Columns are matched
  by header name and the mapping is remembered, because Portal does not
  publish its export format. Labor, fees, custom items, and rows with no
  quantity are listed as skipped instead of vanishing, and a change order
  imported later adjusts the same ticket rather than making a second one.
- Pull from stock moves the quantity from the shelf to the job's staging bay
  and logs it with your name, so the bay and the ticket agree on what is
  ready. Pull everything in stock does the whole ticket and says what is left
  to order.
- Deliver to site checks the line's serialized units out to the person taking
  them, and closing the ticket marks them installed at the job, so a unit
  scanned years later still says which job it went to. Leftovers in the bay
  go back to a shelf or are written off with a reason.
- Copy for Portal builds the status block for the proposal's internal notes,
  since Loadout cannot write to Portal until the API question is settled.
- The wall board turns the TV by the bays into the pick path: lines grouped by
  shelf in rack order, picked lines greyed as the scans land, and a red strip
  when it stops being live, so nobody trusts a stale screen.
- Techs can stage and deliver, and only lower a stock count when they do; the
  board account still reads only. Orders and backorders arrive in 0.3.0; until
  then Order missing is shown but off.

### 0.1.0 (2026-10-29)

First release, so the shop can start counting, labeling, and signing things out
before the owner settles the open decisions in PLAN section 13 (the build uses
the defaults listed there).

- The shop's current inventory workbook imports in one pass with a dry run
  first, because starting from the sheet beats starting from zero. Spellings
  are merged (makes, shelves, colors, units), each row becomes an audit entry
  dated from the sheet, and running it again on a newer copy updates counts
  instead of adding duplicates.
- Wire boxes keep their existing codes and get a box sheet, so a cut of 360 ft
  is logged with the person's name in two taps instead of guessed at the end
  of the month.
- Units worth following one by one (at or above the QR threshold, $250 by
  default) get their own QR, Check out, and Check in, so "who has the gateway"
  has an answer.
- Every change writes a movement, and the rules make that log append-only,
  so a count can always be explained.
- Pick tickets, purchase orders, tracking, and offline use come in later
  versions (PLAN section 12).
