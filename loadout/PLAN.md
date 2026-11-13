# Loadout - office inventory, pick tickets, and product tracking

Plan v0.4 - 2026-10-29 by Fable 5.1 (design/plan pass; v0.1 was 2026-10-23,
v0.2 was 2026-10-26; v0.3 (2026-10-27) adds the warehouse wall board,
section 4; v0.4 renames the tool Loadout and adds section 17).
Nothing here is built yet. Implementation is a later Opus job once the
decisions in section 13 are answered and the owner has read the storyboard.
Open the design switcher at
`file:///T:/ClaudeCodeRepo/work/loadout/design-preview.html` and the storyboard
and functional SOP for the owner at
`file:///T:/ClaudeCodeRepo/work/loadout/storyboard.html` (section 15).

v0.2 adds, from the 2026-10-26 notes: serialized items with their own QR and
a check-out / check-in log (section 8b), a cut log on wire boxes (section 7),
roles with an accounting console (sections 3, 4), a tracking dashboard for
product on order (section 4), and the storyboard (section 15).

**Loadout** is the name (settled 2026-10-29), folder `work/loadout/`. A
loadout is the gear you take on a job, which is what this tool assembles and
tracks. It is still deliberately not "inventory" or "warehouse" in the URL:
internal tools on the work site get a neutral name, no hub tile, no links from
other pages, `noindex, nofollow`, and the shared Watchtower sign-in wall
(`@umbrellaautomation.com` Google accounts only).

Reference products looked at: Portal's own warehouse pick list export, Sortly
and inFlow (bin and photo-first stock apps), ProjX360 (imports won Portal
proposals into inventory and work orders, which is the closest thing to what
this plan builds in-house).

---

## 1. What this is

A phone-first web app that the office uses to:

1. **Turn an approved Portal proposal into a pick ticket** and lay the product
   out for that client in a staging bay, pulling from stock where we have it
   and ordering the rest.
2. **Track product acquisition** per line: ordered, backordered, shipped,
   delivered, checked in, staged, delivered to site, with vendor order number,
   carrier, and tracking number, all tied back to the client, job, and
   proposal number.
3. **Keep a running inventory** of what is on the shelves: new product that
   has not been assigned to a job, and consumables such as Cat5e/Cat6 boxes,
   conduit, connectors, with **feet left** readings for anything sold by
   length.
4. **Write status back to Portal** as an internal note on the proposal when
   it can (API tier), or hand you a ready-to-paste status block when it cannot.

Everyone on the domain shares one dataset. There are no per-user silos: the
warehouse is one warehouse. What differs by person is the role (section 3):
admins and warehouse staff change stock, techs scan, check out, and check in,
and accounting reads the console and reports without touching counts.

Six things it tracks, in a fixed hierarchy:

- **Client > Job > Proposal.** A client has jobs (site addresses or projects);
  a job has one or more Portal proposals, each identified by Portal's
  sequential proposal number. Portal has no separate project object, so the
  job is ours; it exists to group several proposals and change orders for the
  same site.
- **Pick ticket.** One per approved proposal (or per change order). Lines are
  the proposal's Part items grouped by area, with quantity needed, from stock,
  to order, staged, delivered to site. The pick ticket is the working document
  of the whole flow and the thing a tech looks at when loading the van.
- **Product and stock.** A catalog of products keyed by brand + model (what
  Portal gives us), with UPC/barcode captured the first time one is scanned.
  Stock is on-hand quantity per product per location. Products sold by length
  are tracked as **containers** (one record per box or reel) with a
  feet-left reading, and the product's on-hand is the sum.
- **Order and shipment.** A purchase order to a vendor with its lines, each
  line pointing at the pick ticket line it serves (or at stock, for
  replenishment). Shipments carry carrier + tracking and can be partial. A
  product can exist as "on order" before anything is received, so the order
  number and tracking are attached from day one and watched on the Tracking
  dashboard.
- **Item.** One physical unit of a product that is worth following on its
  own: anything received at or above the QR threshold (a cost in Settings,
  default $250), or anything you choose to serialize. An item gets its own
  QR sticker on receive. Scanning it shows where it is, who has it, and its
  history; Check out and Check in record who took it, for which job, and when
  it came back from a client's home.
- **Wire box.** A box or reel of a by-the-foot product. Received by the UPC
  printed on the box, then given a QR sticker. Scanning the QR opens the box
  sheet: the footage mark the box is stopped at now, and the length cut this
  time. Each entry is logged with the employee and the ticket it was cut for.

Every change writes a **movement** (receive, pick, stage, deliver, adjust,
reading, cut, checkout, checkin, return, transfer) so a count can always be
explained. Every record carries the readable names of what it points at, so
the database reads without the app (section 16).

## 2. Decisions (proposed; settle in section 13)

| Decision | Choice | Why |
|---|---|---|
| Home | `frank-umbrella/work`, folder `loadout/` | Same repo and Pages site as Watchtower, Backup Audits, Sundial. Deploys on push. |
| Sign-in | Google, `@umbrellaautomation.com` only, Firebase project `watchtower-6fbe1` | Zero new setup. Copy `firebaseConfig`, `ALLOWED_DOMAIN`, the `hd` parameter, and the post-sign-in domain check from `backups/index.html`. |
| Storage | Firestore, collections prefixed `loadout_`, shared by everyone on the domain | Same trade-off as Watchtower's rules: every employee has full read/write. Movements are the audit trail, so mistakes are visible, not prevented. |
| Portal integration | **Tiered** (section 6): T0 manual import works on any plan today; T1 Zapier push needs Premium; T2 full API needs Unlimited plus an approved application | We do not know the current Portal plan. The pick ticket must not depend on an API we may not have. |
| Notes back to Portal | Append to the proposal's internal notes via API when allowed; otherwise a **Copy for Portal** button | Portal has no comment thread object. Internal notes is a single text field that the update call replaces, and accepted proposals may return 409. Copy-paste is the guaranteed path. |
| Units | `each` or `ft` per product; `ft` products are tracked per container with a feet-left reading | "Feet left" is a reading you take, not a calculation. Picking 150 ft from a 1000 ft box is a movement against that box. |
| Barcodes | UPC scanned with the phone camera; falls back to typing | Portal's item model has no SKU or UPC, so the catalog learns barcodes on first receive. Chrome on Android has `BarcodeDetector`; a lazy-loaded zxing fallback covers iOS Safari. |
| Mobile | Phone first | Scan, pick, and count happen in the warehouse. Bottom tab bar under 640px, thumb-sized buttons, 16px inputs, PWA manifest, offline shell cache plus Firestore persistent cache. |
| Costs and prices | Off by default; a Settings toggle shows Portal cost per line | The warehouse does not need prices. Salespeople might. Playbook money fields when shown. |
| Labels | Printable QR labels for bins, staging bays, wire boxes, and serialized items | A wire box with a QR sticker takes a feet-left reading in two taps; an item with one answers "who has it" in one scan. Inline QR generator, no CDN. |
| Roles | `admin`, `warehouse`, `tech`, `accounting`, stored per user; the first admin is seeded by hand | Accounting needs to read everything and write nothing. Techs need scan, check out, check in, and readings, not product edits. The rules enforce it, so the UI is not the only guard. |
| Serialized items | Automatic at or above the QR threshold (Settings, default $250); manual for anything else | Cheap stock is counted; expensive stock is followed. One scan answers where an AP, a camera, or a processor is and who signed it out. |
| Wire cuts | Every box entry records the mark now and the length cut, by whom, for which ticket | "Feet left" alone does not say who used 360 ft on Tuesday. The cut log does, and the job gets charged the right footage. |
| Tracking dashboard | Its own view: every line on order, grouped by job, with carrier status and ETA | The office asks "where is the UDM for Acme" more than anything else. One page answers it without opening the PO. |
| Wall board | A read-only full-screen view for the warehouse TV: the active pick tickets, lines grouped by the shelf to pull from, picked lines greyed, live from Firestore | A 50-inch screen by the bays answers "what is left and where is it" without anyone picking up a phone. Nothing on it can be tapped, so a stray hand cannot change a count. |
| Analytics | None | Client names and job addresses live in it. |

## 3. Data model (Firestore, project `watchtower-6fbe1`)

```
/loadout_clients/{clientId}
  name, portalContactId (string|null), notes, archived
  createdAt, updatedAt

/loadout_jobs/{jobId}
  clientId, name ("Main office buildout"), address, status ("open"|"closed")
  stagingLocationId (string|null)      the bay/pallet reserved for this job
  createdAt, updatedAt

/loadout_proposals/{proposalId}          doc id = Portal proposal number as string
  jobId, clientId
  portalId (string|null)               Portal's internal id, when known
  number, name, status                 Accepted | Completed | ...
  acceptedAt, importedAt, importSource ("csv"|"zapier"|"api"|"manual")
  lastNoteSyncAt, lastNoteStatus       for the Portal note push (section 6)

/loadout_products/{productId}
  kind            "device" | "patch-cable" | "splitter" | "connector" |
                  "wire" | "other"            from the sheet tab it came from
  type            "CAT6 UTP patch cable", "2 way coaxial splitter", "XLR",
                  "Network"...                the sheet's Type column, kept
  brand, model, description                   blank on most cables and
                                              connectors (section 17)
  name            display name: brand + model when present, otherwise
                  composed from type and attributes ("Cat6 UTP patch
                  cable, RJ45/M to RJ45/M, blue, 3 ft")
  connector1, connector2, color, length, lengthUnit ("ft"|"m"|"in"),
  gauge, gaugeUnit ("awg"|"mm"), inputs, outputs, sex, band, pins,
  wireType ("23/4", "RG6"), grade ("GP"|"Riser"|"Plenum"|"Shielded")
                                              flat optional attributes;
                                              only the ones the kind uses
  unit            "each" | "ft"
  upc             string|null          learned on first scan, or from the
                                       sheet's UPC column (0.7.0)
  category        string               "Wire", "Network", "Camera", "Mount"...
  consumable      bool                 shows in the Consumables view, has a par level
  parLevel        number|null          reorder point in the product's unit
  defaultLocationId (string|null)
  imageUrl        string|null          photo download link, optional (0.5.0)
  imagePath       string|null          its Storage path, loadout/products/{id}.jpg
  imageAt         Timestamp|null       when the photo was last set
  onHand          number               denormalized sum; recomputed on each movement
  portalItemId    string|null          Portal referencedItemId, when imported
  lastCountAt     Timestamp|null       from the sheet's Last Date / Count Date
  createdAt, updatedAt

  Document id: brand-model slug when both exist ("ubiquiti-u6-pro");
  otherwise kind + type + attributes slug
  ("patch-cable-cat6-utp-rj45m-rj45m-blue-3ft"). Same product, same id,
  so a re-import updates instead of duplicating.

/loadout_users/{uid}
  email, name, role ("admin"|"warehouse"|"tech"|"accounting"|"board"), active
                  "board" is the TV's own account: reads everything, writes
                  nothing, and is sent straight to the Board view on sign-in
  addedBy, addedAt, lastSeen
  First admin seeded in the Firebase console; admins manage the rest from
  the console's People tab. A signed-in domain account with no doc gets
  role "tech" and is listed for an admin to confirm.

/loadout_items/{itemId}                  one physical unit, serialized
  productId, cost (number|null)
  serial          string|null          as typed or scanned, for warranty
                                       claims and returns
  mac             string|null          stored AA:BB:CC:DD:EE:FF, so a
                                       networked device can be found on the
                                       client's network (0.7.0); typed with
                                       colons, dashes, dots, or none
  qr              "loadout:item:{itemId}"
  status          "on_order" | "in_stock" | "staged" | "checked_out" |
                  "installed" | "returned" | "retired"
  locationId      where it sits when in stock or staged
  holderUid, holderName                who has it while checked out.
                  holderUid is empty when the holder is a name only: a unit
                  pulled on the inventory sheet is held by the name as typed
                  in Pulled For, with no account (0.7.0). Check-in works the
                  same either way.
  holderNote      string|null          the sheet's Note on a pulled unit;
                                       cleared at the next check-out or
                                       check-in (0.7.0)
  clientId, clientName                 the client a sheet row was pulled for
                                       (Client Pulled For), or the ticket's
                                       client (0.7.0)
  jobId, ticketId, ticketLineId        what it is out for
  checkedOutAt, checkedInAt, condition ("good"|"damaged"|"missing")
  orderId, shipmentId                  where it came from
  createdAt, updatedAt

  Document id: random for units made in the app. An imported unit's id is
  deterministic so a re-import finds it: imp-{productId}-m-{12 hex} for a
  row with a MAC, imp-{productId}-s-{serial slug} for a row with a serial,
  and imp-{productId}-{n} for the rest (the 0.1.0 scheme, unchanged).

/loadout_locations/{locationId}
  area ("Storage room", "Computer Room Shelving Rack", "Warehouse")
  shelf ("RCA A/V Video", "Power cables", "C", "")   blank for a bare area
  name            "Storage room, RCA A/V Video"   composed; what labels print
  kind ("shelf"|"bay"|"van"|"vehicle"|"other")
                  vehicle (0.7.0): a person's car or truck that carries
                  stock, from a sheet Area ending in Car, Van, or Truck. It
                  reads like other: a ticket can pull from it.
  jobId (string|null)                  set while a bay is reserved for a job
  qr              string               payload printed on the label
  Document id: area-shelf slug ("storage-room--rca-av-video").

/loadout_stock/{productId_locationId}    one doc per product per location
  productId, locationId, qty           qty in the product's unit

/loadout_containers/{containerId}        only for unit == "ft" products
  productId, locationId
  upc             the barcode printed on the box, scanned at receive
  label           the shop's existing box code ("A826", "BB"), kept as the
                  id and printed on the QR sticker; new boxes continue the
                  scheme (section 17)
  startLength (1000), ftLeft (640), purchasedAt
  lastMark        the footage mark the box is stopped at (boxes count down
                  from startLength; ftLeft = lastMark on a count-down box)
  status ("open"|"empty"|"assigned"), pickTicketId (string|null)
  qr, createdAt, lastReadingAt, lastReadingBy

/loadout_tickets/{ticketId}              pick ticket
  proposalId, jobId, clientId
  status      "open" | "picking" | "staged" | "delivered" | "closed"
  stagingLocationId
  createdAt, createdBy, updatedAt
  summary     {lines, needed, fromStock, toOrder, staged, delivered}  denormalized

/loadout_tickets/{ticketId}/lines/{lineId}
  area ("Living Room"), option, sort
  productId (string|null)              null until matched to the catalog
  brand, model, description            copied from the proposal so the line reads
                                       even before the product exists
  qtyNeeded, qtyFromStock, qtyToOrder, qtyStaged, qtyDelivered
  portalItemId, orderLineRefs [{orderId, orderLineId}]
  notes

/loadout_orders/{orderId}                purchase order
  Document id (0.5.2): a PO created online takes its number from the
  counter in loadout_settings/counters inside a transaction; a PO created
  offline gets id "draft-<random>" and reads "Draft (no number yet)" until
  Mark ordered assigns the number (online only). The id stays as created;
  `number` is the PO number people see and search by. Settled 2026-11-02:
  records are not moved to a numbered id, so history and ticket links hold.
  number, vendor, orderNumber, orderedAt, orderedBy
  status      "draft" | "ordered" | "partial" | "received" | "cancelled"
  jobId, clientId, proposalId          null for stock replenishment
  notes

/loadout_orders/{orderId}/lines/{lineId}
  productId, brand, model, qtyOrdered, qtyReceived
  ticketId, ticketLineId               what this line serves; null = stock
  status      "ordered" | "backordered" | "shipped" | "delivered" | "received"

/loadout_shipments/{shipmentId}
  orderId, carrier ("UPS"|"FedEx"|"USPS"|"Other"), tracking, trackingUrl
  shipTo      "office" | "client"      client = drop-shipped to the job site
  status ("shipped"|"out_for_delivery"|"delivered"|"received")
  statusLog   [{status, at, by, note}] every change, newest last
  shippedAt, expectedAt, deliveredAt, receivedAt
  lines [{orderLineId, qty}]           partial shipments carry only their lines

/loadout_movements/{movementId}          append-only audit trail
  type        "receive"|"pick"|"stage"|"deliver"|"adjust"|"reading"|"cut"|
              "checkout"|"checkin"|"return"|"transfer"
              (0.5.2 vocabulary: "pick" became "pull" (shelf to bay for a
              ticket) and "transfer" became "move" (shelf to shelf, no
              ticket); "writeoff" added; older records convert on read)
  productId, containerId (null), itemId (null), qty
  fromLocationId, toLocationId
  ticketId, ticketLineId, orderId, shipmentId   whichever apply
  cut         {fromMark, toMark, length}        type == "cut" only
  holderUid, holderName, condition             checkout / checkin only
  by (email), byName, at (Timestamp), note

/loadout_settings/{key}
  "general"   {showCosts, carriers: {UPS: urlPattern, ...}, labelSize,
               qrThreshold: 250}            cost at or above which a received
                                            unit becomes a serialized item
               (as built: also vendors, weekStart, boxStart by cable type,
               and workWeek, the Week view default added in 0.4.0; the
               Console's About tab lists every field from the code)
  "portal"    {tier: "t0"|"t1"|"t2", lastPollAt}   no secrets here
  "importMap" {header -> field} saved CSV column mapping
  "board"     {mode: "pinned"|"all_open", ticketIds: [], rotateSec: 20,
               groupBy: "location"|"area", showStaged: true,
               theme: "dark"|"light"}   set from the ticket's "Show on board"
                                        button and the Console's Board tab
```

Rules to add to `watchtower/firestore.rules` (shared file, deployed with
Watchtower's `firebase.json`, work account `frank@umbrellaautomation.com`):

The deployed source of truth is the `// -------- Loadout (work/loadout) --------`
block in `watchtower/firestore.rules` (copied into `loadout/README.md` under
"Rules"). It differs from the first draft of this section in two ways the
0.1.0 build proved in the Firestore emulator: the `loadout_.*` wildcard no
longer covers collections that have their own rules (Firestore allows a write
if ANY matching rule allows it, so the wildcard was letting warehouse users
edit movements and settings and admins delete movements), and
`loadout_users` lets a signed-in domain account create its own doc as tech,
with the owner account (the existing `backupsOwner()` check) creating its own
as admin, since otherwise the first admin could never exist. Techs may also
write `onHand`, `updatedAt`, `locationName`, `jobName`, and `confirmLocation`
on products and containers so names and totals stay right after a cut or a
check-out, and every movement must carry `by` equal to the signed-in email.
Subcollections use `/{subcoll}/{rest=**}` because a bare `{sub=**}` also
matches the parent document.

The worker (section 6, T1/T2) writes through a service account and bypasses
rules, same as watchtower-worker.

Queries that must stay index-free: open tickets = `status in [open, picking,
staged]`; low stock = client-side filter over `consumable == true` (the
catalog is small); a ticket's lines = subcollection read. Add
`firestore.indexes.json` only when a composite query appears.

## 4. Screens

Current navigation (0.8.0): see section 18. Home with the doors, Jobs (was
Tickets), Scan, Shelf (was Stock and Units), Office (was More and the
Console); the words below are the 0.1.0 to 0.7.0 ones.

Six views. Desktop: top nav like Backup Audits. Phone (under 640px): bottom
tab bar with Tickets, Scan, Stock, Orders, More. A sync pill in the header on
every screen: Synced / Offline, 3 pending.

### Tickets (home)
- List of pick tickets grouped by status, newest first. Each row: client, job,
  proposal number, status pill, progress (staged / needed), staging bay, last
  activity. Sortable, Columns manager, card-stack under 640px.
- **New ticket** opens the import sheet (section 5): paste or upload a Portal
  CSV, or pick an already-imported proposal, or build one by hand.
- Filters: status, client, has items to order, has backorders.
- **States.** Empty: "No pick tickets yet. Import a Portal CSV or build one by
  hand." with the New ticket button under it. Filtered to nothing: "No tickets
  match these filters." with a Clear filters link. Loading: the table header
  with three grey rows and the words "Loading tickets". Error: "Could not load
  tickets. Check your connection and try again." with a Retry button; the sync
  pill shows Offline at the same time.

### Ticket detail
- Header: client, job, proposal number with link to Portal, status, staging
  bay, created by/at, **Copy for Portal** and **Print** buttons.
- Lines grouped by Portal area. Each line: brand/model/description, needed,
  from stock, to order, staged, delivered, order/tracking chips, product match
  state (matched to catalog / new product / unmatched).
- Row actions: **Pull from stock** (choose location, scans allowed, writes a
  pick movement and moves qty to the staging bay), **Order** (adds the line to
  a draft PO; see Orders), **Stage** (marks qty laid out), **Deliver to site**,
  **Note**.
- Bulk: "Pull everything we have in stock" fills from-stock using on-hand and
  the product's default location, then lists what still needs ordering.
- Status moves automatically: any line staged = picking; all lines staged =
  staged; all delivered = delivered; Close is manual and asks about leftovers
  (return to stock or write off).
- Bottom panel: timeline of movements and notes for this ticket.
- **States.** No lines (hand-built ticket, nothing typed yet): "This ticket
  has no lines. Add a line or import a CSV." Timeline empty: "Nothing has
  moved yet." Offline write: the row saves locally, the sync pill counts it,
  and the row gets a small "pending" chip until it reaches the server. Save
  failure after reconnect: toast "Could not save Stage on Ubiquiti U6-Pro.
  Try again." and the row keeps its previous values.
- **Show on board** button in the header pins this ticket to the warehouse
  TV (next screen); it toggles to **Remove from board** while pinned.

### Board (warehouse TV)
- A full-screen, read-only view at `?board=1` (also the landing view for the
  `board` role), meant for a 50-inch TV by the bays, read from three to five
  meters away. No nav, no buttons, no cursor, nothing tappable. Type sizes:
  product line 30px, counts 44px, headers 24px; minimum 4.5:1 on the dark
  theme (default; a light theme exists for a bright shop).
- **What it shows.** The pinned tickets (or every open ticket when the mode
  is "all open"), one ticket per screen, rotating every 20 seconds (set in
  Settings) with a thin progress bar along the top so people know when it
  will flip. Each screen: client, job, ticket number, bay, and a big
  "18 of 24 lines staged" with a bar. Below it the lines, **grouped by the
  shelf to pull from** (the product's location, or its default location when
  stock sits in several), in walking order of the rack labels (A1, A2, A3,
  B1...), so the board is the pick path. Each line: product, quantity still
  to pull, bay, and a state: **Pull** (white, with the shelf), **Picked**
  (greyed, with a check and who picked it), **On order** (amber, with the
  PO and ETA), **Short** (red: shelf count below what the line needs).
  Picked lines sink to the bottom of their shelf group; a shelf group with
  nothing left to pull collapses to one line. With more lines than fit, the
  list scrolls slowly and wraps rather than cutting off.
- **Live.** Firestore listeners update the screen within a second of a
  scan, so a tech watching the board sees the line grey out as the phone
  saves. Offline or disconnected: a red "Not live since 2:14 PM" strip at
  the top; the last data stays on screen.
- **Idle.** No open tickets: the Loadout mark, "Nothing to pick", the three
  lowest consumables with feet left, and the clock. The board never goes to
  a sign-in screen on its own: the TV's account is signed in once and the
  token refreshes in the background.
- **Setup.** Any browser on the TV opens the URL full-screen. The plan's
  recommendation is a small Windows or Linux mini PC in kiosk mode, because
  TV-stick browsers throttle background tabs and lose sign-ins. An admin
  signs it in as the board account and picks the tickets from the Console's
  Board tab or any ticket's Show on board button. Nothing is configured on
  the TV itself.
- **States.** No pinned tickets in pinned mode: "Nothing pinned. Open a
  ticket and press Show on board." Ticket closed while pinned: it drops off
  the rotation on its own.

### Scan (phone)
- Full-screen camera with a scan box. Decoded UPC looks up the product.
  - Known product: shows name, on-hand by location, and three buttons:
    **Receive**, **Pick for ticket**, **Count**.
  - Unknown UPC: "New product" form with brand/model prefilled from the last
    import line that has no UPC yet (one-tap link) or blank.
  - Location or bay QR: switches the active location (shows as a chip).
  - Product QR (a shelf or bin label for a product): the product card,
    same as a UPC hit.
  - Item QR (a serialized unit): the **Item card**: product, serial, where it
    is, who has it, last five movements, and the buttons **Check out**,
    **Check in**, **Move**, **Stage for ticket**. Check out asks for the job
    (or "personal van stock") and notes; the holder is the signed-in user
    unless an admin picks someone else. Check in asks where it went back
    (default: the product's default location) and its condition.
  - Container QR (a wire box): opens the **Box sheet** (section 7): the mark
    the box is stopped at now, the length cut this time (computed from the
    last mark, editable), optional ticket, and Save. The entry is logged with
    the employee's name.
  - Receiving by barcode: with a PO open in Receive mode, each UPC scanned
    counts one unit against the matching line (or asks which line when the
    UPC matches none). Units at or above the QR threshold get an item record
    and a label prompt on the spot.
- Manual entry field under the camera for a typed UPC, model, or QR payload.
- Torch toggle where the browser allows it.
- **States.** Camera permission denied or no camera: the camera area becomes
  a card reading "Camera is off. Allow it in the browser, or type the code
  below." and the manual field takes focus. Nothing recognized after a few
  seconds: "Still looking. Hold steady, or type the code below." Unknown code:
  the New product form, headed "Not in the catalog yet". Lookup error: "Could
  not look that up. It is saved to retry when you are back online."

### Stock
- Catalog table: product, category, unit, on-hand, by location, par level,
  low-stock badge, last movement. Sortable, Columns manager, search.
- **Consumables** tab: only `consumable == true`, with containers expanded
  under each `ft` product: label, location, feet left, last reading. Low
  stock rises to the top with the amber attention treatment.
- Product detail opens **in place under the row** (section 12b item 5), not
  in a modal: edit fields, UPC (scan to set), photo, movements history,
  containers list, **New container** (prints a label), **Adjust** (with
  required reason).
- Locations tab: bins, bays, vans; what is in each; print labels.
- **States.** Empty catalog: "No products yet. Scan a box on the shelf or
  import a proposal to start the catalog." Search with no hits: "Nothing
  matches 'U7-Pro'. Add it as a new product?" with a button that opens the
  form prefilled. No consumables flagged: "No products are marked consumable.
  Edit a product and tick Consumable to see it here with a par level."
  Loading and error states follow the Tickets wording.

### Orders
- List: PO number, vendor, client/job/proposal, status, lines, received /
  ordered, oldest open shipment. Filters by status and vendor.
- Order detail: lines with per-line status and the pick ticket line each
  serves; shipments with carrier, tracking (auto-detected from the number
  pattern: 1Z = UPS, 12/15 digits = FedEx, 20-22 digits starting 9 = USPS),
  link to the carrier page, and dates. **Add shipment** picks the lines it
  carries. **Receive** on a shipment walks each line: scan or tap, qty, into
  the ticket's staging bay (if the line serves a ticket) or into stock.
- Receiving a line serving a ticket bumps that ticket line's staged qty and
  writes a receive movement with ticket, order, and shipment ids.
- **States.** No orders: "No purchase orders yet. Order from a pick ticket
  line or from the low-stock list and the PO appears here." Draft with no
  vendor: the Vendor select carries the amber attention glow and Mark ordered
  is disabled with the tooltip "Pick a vendor first". Tracking number not
  recognized: carrier select stays on Other with "Could not tell the carrier
  from this number. Pick one." Shipment with no lines: "Add at least one line
  to this shipment."

### Tracking (dashboard)
- **Layout (user, 2026-11-02): split down the middle, history along the
  bottom.** Left column: packages coming **to the office**. Right column:
  packages going **straight to a client's site** (drop-shipped), every
  client in that one column, grouped by client and job. Bottom, full width:
  **Recently delivered**, the last 30 days of packages marked delivered or
  received, newest first. Under 900px the two columns stack, office first.
- Each package is one card: carrier chip, tracking number as a link to the
  carrier page, what is in it (product and qty, several lines collapse to
  "3 lines" with a tooltip), the PO and vendor, who it is for (client and
  job, or "Stock" for the office side), the **current status** as a pill,
  and the **date and time of that status** ("Out for delivery, Nov 2 8:14
  AM"). Late packages carry "Expected Oct 30, 3 days late" in amber;
  delivered-but-not-received on the office side float to the top in amber,
  because that is a box in the building nobody scanned. Each card has
  Receive (office side; opens the shipment receive flow), Mark delivered
  (client side; a package to a job site is never received into stock, it is
  staged on the ticket), and Note.
- Status history: every status change on a shipment appends
  `{status, at, by, note}` to `statusLog` on the shipment, and the card's
  pill reads the last entry. A hand-typed status, a delivery date entered on
  the PO, and later a carrier poll all write the same log.
- Filters above both columns: job / client, vendor, carrier, status, late.
  A count in each column header ("Office, 4 packages", "To clients, 2").
- Data: shipments gain `shipTo` ("office" | "client"), set on Add shipment
  from the PO's ship-to (a PO gains `shipTo` and, for client, the job's
  address) and overridable per shipment; `statusLog` as above; `expectedAt`.
- Carrier status is typed by hand or set by the shipment dates in v1; a
  worker cron that polls the carriers' tracking APIs is the later upgrade
  and fills the same log.
- **States.** Nothing on either side: "Nothing in transit. Lines you order
  from a ticket or the low-stock list show here until they are received."
  An empty column keeps its header and says "No packages to the office" or
  "No packages going to clients". Empty history: "Nothing delivered in the
  last 30 days."

### Items (serialized units)
- Table of every serialized item: product, serial, status, location or
  holder, job, days out, last movement. Tabs: Out (checked out), In stock,
  Staged, Installed, Returned, All. Sortable, Columns manager, card-stack.
- **Out** is the page a manager checks on Friday: who has what, since when,
  for which job. Each row has Check in and Nudge (copies a one-line reminder
  to the clipboard; no email in v1).
- Item detail: full history, print label, retire (with reason).
- **States.** No items: "No serialized items yet. Receive something at or
  above the QR threshold (Settings), or open a product and choose Serialize."

### Week (added 2026-10-29, laid out by the user)
- The staging schedule shown like a timesheet. Seven day blocks across the
  top, Sunday to Saturday (week start from Settings), with **Previous week /
  This week / Next week** arrows and the date range above them. Each day is
  its own bordered block with the weekday and date as its header. Days that
  have passed are faded (the whole block at reduced opacity; any text that
  still needs reading stays at 4.5:1, since the cards are a record, not a
  to-do); today's block carries a soft highlighted border (the accent at
  low opacity, 2px, with a faint matching glow) and a "Today" tag; future
  days are full strength.
- Inside a day block, one card per pick ticket due that day: the **client
  name** and the **pick ticket number** as the card header (job name under
  it in small text), then the ticket's **items listed below**, one line
  each, product name on the left and its **status on the right** as a pill:
  Pull, Picked, Staged, On order (with ETA), Short, Delivered. A ticket with
  more than eight lines shows the first eight and "and 14 more" that opens
  the ticket. A small progress figure on the card ("18 of 24 staged").
- A day with nothing: the block stays, with "Nothing due." in muted text.
  Tickets with no install date sit in an **Unscheduled** strip under the
  grid so they are not lost; dragging is not in v1, set the date from the
  ticket or the strip's date field.
- Clicking a card opens the ticket. Clicking a line opens that line's row
  on the ticket.
- Tickets gain an **install date** (`installAt`), set on the ticket header
  and on the import sheet; the Tickets list sorts and filters by it. The
  wall board's pinned mode can also follow "today's tickets" from this
  view (Board setting `mode: "today"`).
- **Layout settled 2026-10-29: B, the timesheet grid** (`week-preview.html`
  compared it with a stacked-lists layout; the user picked B as more visual
  and straight to the point).
- Desktop: the view takes the full window width (no side rail), seven
  columns with `repeat(auto-fit, minmax(180px, 1fr))` so a day block is
  never narrower than 180px; when seven do not fit, the grid wraps to
  four then three per row rather than squeezing. A **Work week** toggle
  in the week strip (remembered per user) hides Saturday and Sunday, so
  five days share the width; a weekend with a ticket on it shows a small
  "1 ticket on Sat" chip that turns the toggle off. Card type is 15px,
  product names wrap to two lines then truncate with a tooltip. Under
  640px: day blocks stack vertically, today first, and the week arrows
  stay fixed at the top.
- Movements under More gains the same Previous / This / Next week arrows
  beside its date fields, so "what moved this week" is one tap.
- **States.** A week with no tickets at all: "Nothing scheduled the week of
  Nov 2. Set an install date on a ticket to see it here." Loading: the seven
  blocks with grey bars. Error: the Tickets wording.

### Console (admin and accounting)
- A separate top-level view, visible to `admin` and `accounting` roles. It
  is read-only for accounting and the management surface for admins.
- **Reports** (each with a date range, a table, and Export CSV / XLSX via the
  lazy-loaded SheetJS pattern from Backups):
  - Stock on hand and value (quantity x last cost), by category and location.
  - Spend by vendor and by month, from POs marked ordered.
  - Product delivered per client and job (from deliver movements), with cost
    when costs are on, for job costing and invoicing checks.
  - Items out: who holds what and for how long.
  - Wire usage: cuts per job and per employee, feet and cost.
  - Movements export: the raw audit trail, filtered.
  - Aging: open tickets by age, open POs by age, delivered-not-received.
- **People** (admin only): the roster from `loadout_users`, role per person,
  confirm newcomers, deactivate.
- **Settings** (admin only): show costs, QR threshold, carriers, label
  size, Portal tier and status, default start length for wire boxes.
- **States.** Reports with no rows in range: "No deliver movements between
  10/01 and 10/26." Accounting sees no edit controls at all, not greyed ones.

### More
- Clients and Jobs management (small tables; most clients arrive by import).
- Movements log (everything, filterable), export CSV.
- Labels: pick locations, containers, or items, print a sheet.
- Link to the Console for admin and accounting roles.
- **States.** Movements log empty: "No movements yet. The first scan, pick,
  or reading lands here." Label sheet with nothing selected: Print is
  disabled with "Pick at least one location or container."

Import sheet errors (section 5): a file with no recognizable header row shows
"Could not find column headers. Pick them below." and the mapping table; a
row with a blank quantity is listed under "Skipped rows" with the reason;
nothing is created until Create ticket is pressed.

## 5. Importing a proposal (T0, works on any Portal plan)

Portal exports a proposal as CSV, PDF, installer PDF, and a warehouse pick list
(with unit of measure since June 2026). The CSV is the import source.

1. In Portal, open the accepted proposal, download the CSV.
2. In Loadout, **New ticket > Import CSV**: drop the file or paste its text.
3. The parser reads area, item type, brand, model, description, quantity, and
   unit where present. Labor, Fee, and CustomItem rows are skipped and listed
   so nothing is silently dropped. Nested accessories keep their parent's
   area.
4. Each row is matched to the catalog by `brand + model` (case-insensitive,
   whitespace-collapsed). Unmatched rows are shown with a **Create product**
   checkbox, ticked by default.
5. You pick or create the client, job, and type the proposal number (prefilled
   when the CSV carries it). Staging bay optional.
6. Create ticket. Lines carry the Portal item id when the CSV has one.

Because Portal's export columns are not published, the parser maps columns by
header name with a preview table so you can fix a mapping once; the mapping is
saved in `loadout_settings/importMap`. The first real CSV decides the final
mapping, so the build needs one sample file from you (section 13, D3).

The same sheet accepts a hand-built ticket (type lines) and a re-import of a
change order, which adds or adjusts lines on the existing ticket rather than
creating a second one.

## 6. Portal integration tiers

What the research found (2026-10-23, docs.portal.io and help.portal.io):

- Public REST API, HMAC-SHA256 signed requests, keys issued by Portal after an
  application; **Unlimited plan only** ($349/mo). Sandbox at
  `sandbox.api.portal.io`; production base URL not published.
- Proposals: list (filter by status, modified-after), get, update. Items are
  readable with brand, model, quantity (decimal), supplier, and `linkedOrders`
  (order id, number, supplier, status). No SKU or UPC anywhere.
- Internal notes: `POST /public/proposals/{id}/internalnotes` replaces the
  field. Accepted and Completed proposals return 409 on edits; whether notes
  are exempt is unconfirmed.
- Webhooks: `proposal.status_changed` and three others; signed; retried.
  No order or shipment events; no tracking numbers anywhere in Portal.
- Zapier (Premium and up, plus the $49/mo Integrations add-on): instant
  triggers for proposal status, order status, payment, change order. The
  proposal payload includes areas, options, items, and CSV/PDF links.
  No Zapier actions, so nothing can be written back this way.

The tiers, each a superset of the one before:

**T0 - Manual (any plan).** CSV import (section 5). **Copy for Portal** builds
a status block and copies it; you paste it into the proposal's internal notes.
Format:

```
[Loadout 2026-10-23 14:05] Pick ticket #1042 - Acme Dental, Main office
Staged 18/24 lines in Bay 2. To order: 4 lines (PO 7731 to ADI, ordered 10/22,
UPS 1Z999AA10123456784 shipped 10/23). Backordered: Ubiquiti U6-Pro x2.
```

**T1 - Zapier push (Premium).** A Zap on "Update Proposal Status" filtered to
Accepted posts the payload to `loadout-worker` (Cloudflare Worker on the
umbrella account, `cf umbrella`). The worker verifies a shared secret, parses
areas/items, writes `loadout_proposals/{number}` and a draft pick ticket through
the Firestore service account, same pattern as watchtower-worker. The ticket
appears in Loadout with "Imported from Portal, review" before anyone touches it.
Order-status triggers can also update order lines to Received when Portal's
own PO is marked received. Still no write-back.

Built 2026-10-29 in `loadout/worker/`; T2 stub only until D1 is answered.

**T2 - API (Unlimited + approved application).** The worker holds the Portal
app id and user key as secrets (`wrangler secret put`, never in chat). It
subscribes to `proposal.status_changed`, pulls the proposal on Accepted, and
on every Loadout status change appends to the proposal's internal notes by
reading the current text, appending the status block, and writing it back.
If accepted proposals return 409 for notes, T2 falls back to T0's copy button
and the plan notes it. Also lets Loadout show Portal's `linkedOrders` beside our
own PO lines.

Build T0 first. T1 and T2 are worker work and need the plan tier known.

## 7. Wire boxes: feet left and the cut log

- A `ft` product has containers (boxes or reels). **Receive** scans the UPC
  printed on the box, which identifies the product; the box gets a container
  record with `startLength` (1000 by default for Cat5e/Cat6 boxes, editable),
  a label like "Cat6 blue box 3", and a QR sticker from the label sheet.
- **Box sheet** (opened by scanning the box QR, or from the product's
  containers list). Two numbers and a Save:
  - **Mark now**: the footage printed on the cable where it leaves the box.
    Pull boxes count down from 1000, so the mark is the feet left.
  - **Cut this time**: computed as last mark minus mark now, editable when
    the box was stopped mid-day and the user knows the real figure.
  - Optional **For ticket** chip (prefilled with the ticket whose bay the
    box sits in), optional note.
  - Save writes one `cut` movement with `{fromMark, toMark, length}`, the
    employee's name, and the ticket, then sets `lastMark` and `ftLeft`. The
    product's on-hand drops by the cut length.
  - Quick buttons -50 / -100 / -250 remain for the common pulls; **Empty**
    writes a final cut to zero and closes the box.
- **Reading** without a cut (a recount) is the same sheet with Cut set to
  zero and the note "recount"; it writes a `reading` movement instead. A
  reading replaces the estimate the picks built up.
- The end-of-day habit the SOP asks for: before the box goes back on the
  rack or the van, scan its QR and enter the mark. Thirty seconds, and the
  job is charged the right footage with the right name on it.
- **Pick for ticket** against a container subtracts the typed feet and tags
  the ticket. The container can be marked assigned to the ticket so it travels
  to the site with the staging bay.
- `Empty` sets `ftLeft = 0`, status `empty`, and drops it from on-hand.
- On-hand for the product = sum of open containers' `ftLeft` plus any
  `loadout_stock` rows (for a `ft` product those should stay at zero; the UI
  hides them).
- Par level on a `ft` product is in feet; low stock shows "640 ft left, par
  1000 ft, order 2 boxes".

## 8. Orders and shipments

- A draft PO collects lines from tickets ("Order" on a line) and from the
  low-stock list ("Reorder"). Vendor and order number are typed once the
  order is placed; **Mark ordered** stamps `orderedAt` and `orderedBy`.
- Line status moves independently: backordered (vendor says so), shipped
  (shipment created carrying it), delivered (carrier says so, set by hand or
  by the date field), received (checked in by scan or tap).
- A shipment needs carrier + tracking; carrier auto-detected, overridable.
  Tracking links use URL patterns in Settings.
- Order status rolls up: all lines received = received; some = partial.
- Everything shows on the pick ticket line as chips: "PO 7731 - UPS - shipped
  10/23". The ticket's **Copy for Portal** block reads from these.
- No carrier API polling in v1. If wanted later, a worker cron with the
  carriers' free tracking APIs fits the same pattern as clover-worker.

## 8b. Serialized items: check-out and check-in

- **What gets an item record.** On receive, any unit whose cost (from the
  PO line, or the product's last cost) is at or above the QR threshold in
  Settings (default $250). Also anything a warehouse user chooses to
  **Serialize** on a product, in any quantity. Item records are created at
  receive, so the QR label prints while the box is still on the bench.
- **The label.** QR payload `loadout:item:{itemId}` plus a human line: product
  and the last 6 of the item id (or the serial when typed or scanned from the
  box). Printed on the 2x4 sheet for anything that will live in a rack, or
  the small sheet for handhelds.
- **Check out.** Scan the item QR, tap Check out, pick the job (or "van
  stock"), optional note. Writes a `checkout` movement with holder, job, and
  time; the item's status becomes `checked_out` and its location clears.
  A pick ticket line can also check out all its serialized items in one tap
  when the ticket is delivered to site, so a van load of five APs is five
  records in five seconds.
- **Check in.** Scan the item QR, tap Check in, confirm where it goes
  (default: the product's default location, or the bay of the ticket it was
  out for), pick a condition (good / damaged / missing-parts), optional note.
  Writes a `checkin` movement; status returns to `in_stock` (or `returned`
  when it came back from a client's home and needs inspection before it is
  stock again; a warehouse user moves it to in_stock after looking at it).
- **Installed.** Delivering a ticket line checks its items out to the tech
  who is delivering (one tap for the whole line). Closing the ticket marks
  every item still checked out on it `installed` with the job; anything
  checked back in before that stays stock. Installed items stop counting as
  stock but keep their history, so a service call two years later can scan
  the sticker on the rack and see when it went in and on which proposal.
- **Who can do what.** Techs check out and check in. Warehouse and admin can
  also move, retire, and change the holder (for "Dana took it, not me").
  Every one of these writes a movement with the signed-in name; there is no
  anonymous change.
- **Where it shows.** The Items view (section 4), the item card on scan, the
  product detail's Items tab, the ticket line's chips ("2 of 4 checked out
  by Tech"), and the Console's Items-out report.

## 9. Offline

- `sw.js` precaches the app shell; Firestore `persistentLocalCache` holds
  data; every write goes local first. Scanning and counting in a dead corner
  of the warehouse must work; the sync pill shows pending writes.
- The camera does not need the network. Lazy-loaded zxing is in the precache
  list so the iOS fallback also works offline.

## 10. Labels and QR

- Payloads: `loadout:loc:{locationId}`, `loadout:ctr:{containerId}`,
  `loadout:prod:{productId}`, `loadout:item:{itemId}`. The Scan view routes on
  the prefix; a plain UPC routes to the product lookup (and, in Receive mode,
  counts a unit against the open PO).
- Every label carries the payload as a QR and a human-readable line, so a
  torn or unreadable sticker can still be typed into the manual field.
- Label sheet: Avery 5160 (30 per sheet) and 2x4 (10 per sheet) layouts, QR
  plus a human-readable line. Inline QR encoder (a small vendored function, no
  CDN). Print via the browser's print dialog with `@page` margins set.

## 11. Playbook standards checklist

- Toasts top-center for passive confirmations; decisions use modals.
- Form modals close only via X / Cancel / confirm.
- No horizontal scrollbars anywhere; card-stack tables under 640px;
  `minmax(0,1fr)` grids.
- Tables sortable with reset, Columns manager, saved layout per user in
  `/users/{uid}` (the Watchtower per-user prefs doc).
- Unset decision dropdowns get the amber attention glow (vendor on a draft PO,
  client on an import).
- Money fields `$` + 2 decimals when costs are shown.
- Fields wide enough for their values; dates never truncate; tooltips on
  every non-obvious field explaining why.
- Favicon, OG card (house style, no version text), semver in the title, A2HS
  manifest, `noindex, nofollow`, no repo link in the UI.
- Version constant, HTML meta, visible UI, README changelog, and the `sw.js`
  `VERSION` (its cache name) bump together; a stale sw.js serves the old shell.
- Every text color meets WCAG AA on every surface it sits on: 4.5:1 for
  normal text, 3:1 for 18px+ and for control borders. Status text uses the
  `--m-*-text` variables, never the raw status hue. Check with
  `.claude/skills/antislop-human/contrast-check.py` before each release.
- Every control is a real `<button>` or `<a href>`, reachable by Tab in
  visual order, activatable with Enter or Space, with the browser focus ring
  or a replacement that meets 3:1. Modals close with Escape. Never
  `outline: none` without a replacement.
- Every data view ships its empty, loading, and error state with the wording
  in section 4 before the happy path is called done.
- On the phone (under 640px) every control is at least 44px tall with a gap
  between neighbors; desktop may use the smaller sizes.
- Design reasons, written down so the build does not drift:
  - Uppercase labels with .04em tracking (field labels, table headers, stat
    keys): they read as labels beside dense numbers. Never wider tracking;
    Manifest uses serif sentence-case headings instead.
  - Left stripe on a `.need` row: it marks a real state (needs ordering).
    Manifest's tan stripe and ruled lines on the ticket card: the clipboard
    motif, used on that one card only.
  - Palette per theme: one accent, three status hues (ok, warn, danger) plus
    info, and the two carrier colors only on shipment chips. Nothing else.
  - Amber attention glow on unset decision dropdowns: Playbook rule. It stays
    lit and pulses three times on load, then rests; no endless animation.
  - Mono face for anything printed on a box or a label (container names,
    tracking numbers, UPCs), and in Rack for every count; sans elsewhere.
  - Dials: ENERGY 1 / RHYTHM 1 / MOTION 1. A staff tool used while holding a
    box; nothing moves unless it reports a state change.

## 12. Build phases (Opus, after section 13 is answered)

| Version | Scope |
|---|---|
| 0.1.0 | Shell, sign-in, roles and rules, Stock view, product CRUD, locations, movements, Scan with UPC lookup and receive/count, wire boxes with the box sheet and cut log, serialized items with check-out / check-in, QR labels and label sheets, and the **inventory sheet importer** (section 17) so day one starts from the current spreadsheet, not from zero. The warehouse can be counted, labeled, and signed out. |
| 0.2.0 | Clients, jobs, proposals, CSV import with header mapping, pick tickets with lines, pull-from-stock, stage, deliver (checks items out to the tech), close (marks them installed), print, Copy for Portal (T0), the warehouse wall board with Show on board. |
| 0.3.0 | Orders, lines, shipments, carrier detection, receive-by-shipment into bays with barcode counting, chips on ticket lines, low-stock reorder into draft POs, the Tracking dashboard, the Week view with ticket install dates and week arrows on Movements. |
| 0.4.0 | Console: reports with CSV / XLSX export, People, Settings, About (data dictionary), Export everything (one CSV per collection, zipped); accounting role end to end. |
| 0.5.0 | Offline (sw.js + persistent cache + sync pill), PWA manifest, photos on products. |
| 0.6.0 | loadout-worker: T1 Zapier intake (if Premium) or T2 API intake and note push (if Unlimited and approved); nightly CSV export to the project's Storage bucket, listed under Console > Backups (0.6.1); carrier tracking poll if wanted. Settings shows the tier and last sync. |
| 0.8.0 | Simple mode (section 18): Home with the doors (Pick up, Deliver, Pull, Audit), Job and Pull sheet words, Shelf (Stock and Units), Office (More and the Console), the Pick up step and Confirm a delivery screens, Audit a shelf, one strip and one next step per job card, the wall board as a six-card grid, every old address kept as an alias. Built 2026-11-05, not committed. |
| 0.9.0 | Section 20: the focused Pull screen (`#pull/<jobId>`) in pick order, the Pull door split into pullable and waiting on orders, Bring back from a van with the Close job van rule, Receive a shipment as the fourth door (serial or MAC on shipment receive), Arrived for carrier drops, the non-zero progress line, the QR on the printed pull sheet, the board's phone layout (20.3), the leftover-words sweep, `loadout_settings/worker` in the data dictionary, and the tech rules run in the emulator (14 of 14). Built 2026-11-11, not committed, rules not deployed. |
| 0.10.0 | Section 21.4 Photo from a UPC (the sheet after every UPC save, Find a photo, Review photos after an import, the demo fixtures; needs loadout-worker 0.3.0 deployed), 22.1 New job made plain (two choices, three hand-built steps, "Here is what the file says"; the same writes as 0.9.1), 22.2 More for techs (`officeWord()`), 23 the Job report, 24 the account block in the header and the Account sheet. Built 2026-11-11, not committed, no rules change. |
| 0.11.0 | Section 25: Brand and Category as pick lists (comboboxes) on New product and the product panel, Type with suggestions by category, the admin's Add confirm with `tidyName`, the refusal for other roles, `normKey` in the Shelf filters, the Stock report by category, the inventory importer and the proposal file reader, `loadout_settings/lists`, and Office > Settings > Brands and categories (Rename, Merge into, Probably the same, Look alike, batches of 400). Built 2026-11-11, not committed, no rules change. |
| 0.11.1 | Section 27: the `TIPS` table (one sentence per action, keyed by action and a context word), `tipFor` in the panel builders, the fill pass in the MutationObserver for every button and button-styled link drawn as a string, the confirm sheets' button taking the sheet's own sentence, `Loadout.tipAudit()`, and What do these do? under action rows on a coarse pointer. Section 28: the Home link on the five door screens (28.1); Rename (admin, through the Brands and categories runner), Archive and Unarchive (admin, empty locations only), Show archived, the Kind tooltips, and the Settings line for locations (28.2). Built 2026-11-11, not committed, no rules change. |
| 0.12.0 | Section 29: a documentation release. `storyboard.html` opens on a new In pictures tab (the nine-panel comic with the words of 29.1, the flow chart in three lanes with Where the product is, and Your job in Loadout, a printable sheet per role); every sketch checked against the demo, ten redrawn and eleven added, 26 panels in the comic's order, each linked to its SOP; the Overview opens with the chart. In the app only Office, About, How Loadout works (29.3) and the version. Built 2026-11-12, not committed, no rules change. |
| 0.12.1 | Section 31, the pictures only: comic panel 1 redrawn as the office dropping the proposal file (.csv) onto New job ("Client said yes. Uploading the proposal file." / "The file from Portal becomes the job. No file? Make the list yourself."); the flow chart's first box reads New job, Upload the Portal file, or make the list; storyboard panel 1, SOP-3, and the Office sheet say the office uploads the file; deck slides 2, 3 and 8 retaken. The PDF reader is not built. In the app only the version. Built 2026-11-13, not committed, no rules change. |
| 0.12.2 | Documentation only, `storyboard.html`: the header is the mark and title, the subtitle, and one line ("Version 0.12.2, updated Nov 13, 2026" and a What changed link); the run-on release paragraph moves to a new last tab, History (`?tab=history`), one entry per version, newest first, with v0.2 to v0.6.2 under Earlier drafts; it prints alone and last in Print everything. Tidied chrome: seven equal tabs with a tinted selected state (a two-column grid of 44 px tabs on the phone), Read this first and Contents as one box style with one heading size, and a footer with the version and date only. In the app only the version. Built 2026-11-13, not committed, no rules change. |
| 0.9.1 | Section 21.1 Shelf filters (Category from the product's own category, Type, Brand, Location, Consumables only; chips, the phone Filter sheet, session only) and 21.3 history as one vertical timeline everywhere; the home-screen strip, card, and Office > This phone on phones and tablets only; an odd last door spans both columns on Home; leftover "Stock" words. 21.2 stays an idea. Built 2026-11-11, not committed. |

Each version is a release: bump the version everywhere, README changelog entry
with the why, small commits.

## 12b. Fix list from the first live run (2026-10-29)

Status: all five items are done in 0.3.0 (README changelog). Item 4 also
closes the space in a connector's hyphen ("Edison- M" reads "Edison-M"),
since a comma there would split one connector in two.

The user deployed the rules, signed in, and imported the workbook on the live
site. Confirmed working: 262 products, 216 consumables, 17 locations, 13
serialized units, 300 import movements naming the workbook tab and row, wire
boxes with feet left and "Confirm location" flags. To fix in the next phase:

1. **Title-casing mangles slash words.** "A/V" became "A/v" in composed names
   ("1 Pin A/v Cable- Black Band"). Keep letters after a slash upper-case
   when the source had them so, and do not title-case a token that is all
   caps and 3 letters or fewer on either side of a slash. Re-import must
   rename the affected products (same ids, new `name`).
2. **Serialized unit labels are ugly.** Units imported as "Unit C-IW-1" and
   "Unit -WHT-1" (the tail of the model slug). The label should be the
   product name plus a number: "Unifi UAP-AC-IW #1". The QR payload and id
   stay as they are.
3. **Import movements carry the import time, not the count date.** Every
   import row shows 10/29/2026 4:42 PM. Section 17 asked for the sheet's
   Last Date / Count Date / As of Date as the movement time (keep the
   import time in a `importedAt` field) so the history reads as the real
   count dates. Movements already written stay; a re-import may not
   duplicate them.
4. **Type spacing from the sheet.** "Audio- Outdoor" and "Cable- Black Band"
   carry the sheet's stray hyphen spacing; normalize " - " / "- " / " -" to
   ", " in composed names only, leaving `type` as typed.

5. **Stock rows expand in place instead of opening a modal.** (User, after
   the first live run.) Clicking a product row opens a panel directly under
   that row, pushing the rows below down: the editable fields in a tidy
   two-column grid (name, brand, model, category, unit, par, default
   location, UPC with Set by scan, consumable toggle, cost when costs are
   on), then the on-hand-by-location list, the containers list for `ft`
   products, and one row of buttons (Save, Receive, Adjust, Serialize, New
   box, Print label, History). One row open at a time; clicking another
   row closes the first; Escape or the chevron closes it; the URL hash
   carries the open product (`#stock/p/<id>`) so a link lands on it open.
   On the phone the card itself expands the same way. Modals stay for the
   decisions (Receive, Adjust, Serialize, New box) because they need a
   confirm; the detail view itself is no longer a modal. Apply the same
   pattern to Items rows and Locations rows so the three tables behave
   alike. Keep the row's height stable while it is closed so sorting and
   scanning the list does not jump.

6. **Tracking-number links are under 44px on the phone** (Tracking and
   Order detail, inline text links from 0.3.0). Give them 44px tap height
   with padding, or wrap them in the carrier chip.

7. **Worker-imported tickets are not marked in the app.** The worker sets
   `needsReview: true` and `importSource: "zapier"`, but 0.5.0 shows neither:
   ticket detail labels every non-manual ticket "Imported from CSV". Show an
   "Imported from Portal, review" chip on the Tickets list and the ticket
   header while `needsReview` is set, with a Reviewed button that clears it
   (warehouse/admin), and label the source by `importSource`.
8. **Order lines should carry a unit cost** (`unitCost` at Mark ordered,
   defaulting from the product's last cost) so the Spend and Delivered
   reports stay fixed when a product's cost later changes.

Status: items 6, 7, and 8 are done in 0.5.1 with the Tracking split (README
changelog). Item 7 reads the source from the ticket's `source` or the
proposal's `importSource`, since the worker writes `source: "zapier"` on the
ticket.

Status (2026-11-02): audit-002 (`anti-slop/audit-002-2026-11-02.md`, 36
findings) is fixed in 0.5.2; the follow-up table at the end of the audit
lists each fix with its evidence. Section 12c is the next release.

Decisions recorded from the 0.5.0 build (2026-10-29): the service worker
registers in demo mode too (needed for the offline test; harmless); product
`imageUrl` stores the Firebase download link, so anyone holding the link can
open the image without the read rule, accepted for product photos because it
lets photos show offline; `sw.js` carries its own `VERSION` that must be
bumped with every release (added to section 11); Storage must be enabled on
`watchtower-6fbe1` (may need Blaze) before the storage rules deploy.

## 12c. Clean pass (user, 2026-11-02): mobile one-handed, desktop, TV

After audit-002's fixes, one release devoted to finish. Fable writes the
detail; Opus makes every edit. The bar: a tech holding a box in one hand
and the phone in the other can do every warehouse action with a thumb, the
desktop reads like one product and not five phases, and the TV board is
legible from the bays.

**Phone, one hand (under 640px)**
1. Primary action at the bottom. Every sheet and modal on the phone opens as
   a **bottom sheet** (slides up, rounded top, drag handle, 16px side gutter)
   with its confirm button full-width at the bottom and Cancel above it, so
   the thumb never reaches the top of the screen. Escape and the handle
   close it; outside-tap does not (Playbook).
2. The bottom tab bar stays: Tickets, Scan, Week, Stock, More; Scan is the
   raised center button. Safe-area padding on iOS. Nothing important sits
   under it (scroll padding equal to the bar height).
3. Row actions on cards sit in the card footer as full-width or half-width
   44px buttons, never as small links; at most two visible, the rest under a
   "..." sheet. The most likely action is first and filled (accent).
4. Scan is the phone's home: the camera area is as tall as the viewport
   allows above the result card; the manual field is one tap away; the
   result card's buttons are large; the Box sheet's number field is 44px
   high with the quick buttons directly under the thumb.
5. Reach: the sticky header shrinks to 48px when scrolling on the phone;
   filters collapse into one "Filters" button that opens a bottom sheet;
   search fields keep a clear (x) button.
6. Inputs: 16px font so iOS does not zoom; numeric fields use
   `inputmode="numeric"` or `decimal`; date fields use the native picker;
   selects are native on the phone.
7. Text: 15px body minimum on cards, 13px for muted meta; nothing smaller.
   Tap targets 44px with 8px between neighbors; pills are not tappable.
8. Feedback: every write shows its toast within the thumb's view (top-center
   stays, but on the phone the toast sits just under the header, not behind
   the notch); offline writes say so once per outage.

**Desktop (640px and up)**
9. One header, one nav order, one spacing scale (8 / 12 / 16 / 24 / 32),
   one card radius, one table style, one pill set across all nine views; the
   consistency map from audit-002 is the checklist.
10. Expand-in-place rows: open state has a visible left accent bar and a
    close chevron at top right; only one open; the row above and below keep
    their height.
11. Tables: header row sticks under the app header on long lists; sort
    arrows visible on hover and on the active column; the Columns manager is
    a popover, not a modal; empty states inside the table body.
12. Forms: labels above fields, 2-column grid at 900px and up, single column
    below; the first field focused on open; Enter submits where there is one
    text field; required fields marked by the glow when they are decisions
    and by a plain "required" note otherwise.
13. Keyboard: Tab order follows the visual order; focus ring 2px accent;
    `/` focuses search; Escape closes anything open.

**TV board (`?board=1`)**
14. Legible from 4 m: product line 32px, counts 48px, headers 26px; line
    height 1.3; no element under 24px.
15. One screen per ticket; if the lines do not fit, the list scrolls slowly
    (40px per second) and pauses 3 s at each end; the header and the
    progress bar stay fixed.
16. The rotation progress bar is 6px and visible from the floor; the "Not
    live since" strip is 32px tall with the time.
17. Burn-in: nothing stays at the exact same pixels for hours; shift the
    layout by 2px every rotation; the idle screen moves its clock.
18. Light theme contrast checked on a bright shop (4.5:1 minimum, 7:1 for
    the counts).

**Details, everywhere**
19. Numbers: tabular figures; feet and counts right-aligned; money `$` with
    two decimals; dates as "Nov 2" in the current year and "Nov 2, 2025"
    otherwise; times as "8:14 AM"; relative "3 days late" only next to the
    absolute date.
20. Words: one term per thing across the app (pick ticket, bay, box, unit,
    PO, shipment); button labels are verbs; pills are states; no two
    spellings of the same state.
21. Icons: the five tab bar icons plus chevrons and the case mark; nothing
    else decorative.
22. Motion: 150 ms for sheets and expands, none for pills; the attention
    glow three pulses then static; no endless animation anywhere but the
    board's rotation bar.
23. Empty, loading, and error states on every list, with the next action.
24. Every non-obvious field has a tooltip that says why; on the phone the
    tooltip is a tappable "?" that opens a small sheet.

Status (2026-11-02): all 24 items built in 0.6.0, not committed (README changelog lists the choices: Scan as the middle tab, Items renamed Units).

## 13. Still open (answer before the build)

**Assumed for the first build (2026-10-29).** The user asked for the build to
start so the shop can feel it out before the owner's decisions are in. The
build proceeds on these defaults; each is a one-line change later and the
decision text below stays until the real answer lands.

| Decision | Assumed |
|---|---|
| D1 Portal plan | Unknown; T0 only (CSV import + Copy for Portal). No worker. |
| D2 Roles | `frank@umbrellaautomation.com` seeded as admin; every other domain sign-in lands as tech until an admin confirms a role. Warehouse and admin receive; techs do not. |
| D3 Sample CSV | None yet; the importer maps by header name with a preview, prefilled for Area, Item Type, Brand, Model, Description, Quantity, Unit. |
| D4 Staging | Labeled bays: Bay 1 to Bay 4 seeded as locations of kind `bay`. |
| D5 Vans | Location kind `van` exists; Van 1 and Van 2 seeded. |
| D6 Receiving | Tap-to-receive by line, scanning optional. |
| D7 Costs | Behind the Settings toggle, off by default. |
| D8 Name | Loadout (settled). |
| D9 Design | B Ledger. |
| D10 Firebase | `watchtower-6fbe1`, collections `loadout_*`, rules appended to `watchtower/firestore.rules`. |
| D11 QR threshold | $250. |
| D12 Wire boxes | Count down from the start length; mark now = feet left. |
| D13 Sign-off | Build is a prototype for feel; the owner's mark-ups land as changes, not as a blocker. |
| D14 Wall board | Any full-screen browser; pinned mode, 20 s rotation. |
| D15 Database | Firestore (settled). |
| D16 Box start lengths | Default by cable type at import: Cat5e / Cat6 / coax 1,000 ft; audio, speaker, and stranded 500 ft; anything else 1,000; every box editable afterwards. Boxes whose feet left exceed the default take their feet left as the start. |
| D17 Assigned inventory | Unassigned only; jobs start from new pick tickets. |

- **D1 Portal plan.** Which plan is Umbrella on (Lite / Pro / Premium /
  Unlimited), and is the Integrations add-on active? Decides whether 0.5.0 is
  Zapier, API, or skipped.
- **D2 Who uses it.** Roles are now in the plan (admin, warehouse, tech,
  accounting). Who is in each? Names or emails per role, and whether techs
  may receive product or only warehouse staff.
- **D3 Sample CSV.** One real Portal proposal CSV (and a warehouse pick list
  export) so the import mapping is right the first time. Scrub prices if you
  like; brand/model/qty/area are what matter.
- **D4 Staging.** Do you stage by bay/pallet with a label, or by a shelf per
  client? Decides the default location kinds and whether bays are reserved
  per job.
- **D5 Vans.** Track van stock as locations now (recommended, it is just
  another location kind) or later?
- **D6 Receiving.** Scan every box on receive, or tap-to-receive by line with
  scanning optional? Plan assumes optional.
- **D7 Costs.** Show Portal cost per line to everyone, nobody, or behind the
  Settings toggle (default)?
- **D8 Name.** Settled 2026-10-29: **Loadout**. (Spool, Depot, Quartermaster,
  Keep, Hold, Manifest, Stow, Dock, Crate, Kit, Packout, Pull and others were
  considered; Pull stays as the fallback.)
- **D9 Design.** Pick A, B, or C from the switcher. Design Read: a staff
  warehouse app for two to five people on phones and one desktop, in the
  Backup Audits family, dial ENERGY 1 / RHYTHM 1 / MOTION 1. B is recommended
  for the same reason Sundial picked Ledger: it matches Backup Audits and
  reads as business software, and it now carries a mark of its own (ruled
  area headers, mono for anything printed on a box or label). A is the pick
  if the phone in the rack room matters more than the desktop next to the
  other tools; C if you want the paper feel and will print tickets often.
- **D10 Firebase.** OK to keep this in `watchtower-6fbe1` with `loadout_`
  collections, or do you want a dedicated project for inventory data?
- **D11 QR threshold.** Serialize every unit received at or above what cost?
  The plan says $250. Say a number, or "everything with a serial number".
- **D12 Wire box direction.** Do your pull boxes print the footage counting
  down from 1000 (mark = feet left), or up from 0? The box sheet's math flips
  on this; the plan assumes counting down.
- **D13 Storyboard sign-off.** The owner reads `storyboard.html` (section
  15) and either approves it or marks up what the flow gets wrong. The build
  starts after that, not before.
- **D15 Database.** Settled 2026-10-29: **Firestore**, as recommended in
  section 16. Postgres is off the table for v1; the one-for-one SQL mapping
  rule stays so the door is not locked.
- **D16 Box start lengths.** The current sheet has feet left per box but
  not what each box started at, and the maximums show they are not all
  1,000 (one box type reads 1,954, coax 1,000, several under 800 and
  already partly used). At import, each open box needs its start length
  typed once, or a default per cable type (Cat6 1,000; RG6 1,000; audio and
  speaker 500?). Which?
- **D17 Assigned inventory.** The sheet is "Unassigned Inventory", so there
  is presumably a per-job or assigned list somewhere. Is there, and should
  it be imported as staged stock against jobs, or does Loadout start with the
  unassigned stock only and build the rest from new pick tickets?
- **D14 Wall board hardware and mode.** What drives the TV: a mini PC in
  kiosk mode (recommended), a Chromecast or Android stick browser, or a
  laptop? And one pinned ticket at a time, or rotate through every open
  ticket? The plan defaults to pinned, rotating every 20 seconds.

## 14. Files

- `work/loadout/PLAN.md` - this file.
- `work/loadout/design-preview.html` - switcher with three directions, four
  views each (Ticket detail, Stock/Consumables, Orders, Scan on phone).
- `work/loadout/anti-slop/audit-001-2026-10-23.md` - antislop audit of the
  switcher and this plan, with the follow-up record of what was fixed.
- `work/loadout/storyboard.html` - the storyboard and functional SOP for the
  owner (section 15). Self-contained, prints to PDF from the browser.
- `work/loadout/samples/` - real test data (the owner's Excel sheet, a Portal
  CSV). Ignored by git because the repo is public; never commit anything in
  it. Sessions read it from disk to shape the import mapping and seed data.
- Later: `index.html`, `sw.js`, `manifest.json`, `og-image.png`, icons,
  `README.md`; rules block in `watchtower/firestore.rules`;
  `loadout-worker/` for T1/T2. The design switcher gains Tracking, Items,
  Console, and Board views once D9 picks a direction.

## 15. Storyboard and functional SOP (for the owner, before the build)

The owner asked for a storyboard and a functional SOP before anything is
built. `storyboard.html` is that document: one page, printable, written for
someone who will never open this plan. It has three parts.

**Part 1, the day in the warehouse (storyboard).** Thirteen panels, each a
sketch of the phone or desktop screen with a caption of what the person does
and what the system records:

1. Approved proposal arrives: download the CSV from Portal, import it, the
   pick ticket appears with every part grouped by room.
2. Pull from stock: scan the shelf label, scan the product, confirm the
   count, the line turns green and the bay fills.
3. Order the rest: one tap builds a draft PO; vendor and order number typed
   when it is placed.
4. Track it: the Tracking dashboard shows each line on order with carrier,
   tracking link, and expected date; late ones rise.
5. Receive: scan each box's UPC against the open PO; counts tick down;
   anything over the threshold prints an item sticker on the spot.
6. Label: QR stickers for the bay, the wire box, the AP.
7. Wire box: scan the box QR, enter the mark where it stopped, Save; the cut
   and your name are logged against the ticket.
8. Load the van: deliver the ticket; the serialized items check out to the
   tech in one tap.
9. On site: an item sticker on the rack can be scanned years later to see
   when it went in and on which proposal.
10. Something comes back: the tech scans the item at the shop, Check in,
    condition, where it goes; the return is logged with the name.
11. End of day: wire boxes back on the rack get their mark entered; the
    sync pill shows everything reached the server.
12. Accounting: the Console shows delivered product per job with cost, spend
    by vendor, items out, and exports to a spreadsheet; nobody in accounting
    can change a count.
13. The wall board: the TV by the bays shows the pinned ticket, lines
    grouped by the shelf to pull from, picked lines greyed as the scans
    land, on-order lines in amber with their ETA.

**Part 2, the functional SOP.** Numbered procedures, each with who does it,
when, the steps, and what gets recorded:

- SOP-1 Receiving product (with and without a PO; the QR threshold).
- SOP-2 Labeling (bays, shelves, wire boxes, items; when to re-label).
- SOP-3 Building a pick ticket from an approved proposal.
- SOP-4 Picking and staging (pull from stock, the wall board as the pick
  path, bay discipline, partial picks).
- SOP-5 Ordering and tracking (draft PO, order number, shipments, the
  dashboard, delivered-but-not-received).
- SOP-6 Wire boxes (receive by UPC, the box sheet, end-of-day marks, empties).
- SOP-7 Check-out and check-in of serialized items (van stock, returns from
  a client's home, damaged or missing).
- SOP-8 Delivering a ticket and closing it (installed items, leftovers back
  to stock or written off).
- SOP-9 Counts and adjustments (who may adjust, the required reason).
- SOP-10 Roles and the Console (what each role sees, how accounting pulls
  a report, how an admin adds a person).
- SOP-11 Portal notes (Copy for Portal today; automatic later).

**Part 3, what it is not.** Half a page of boundaries so the owner's
expectations match: not a replacement for Portal's proposals or QuickBooks,
no carrier polling in v1, no barcode on things that never had one until it
is scanned once, no per-item tracking below the threshold unless chosen.

The page is a self-contained HTML file in the house style of the SOP library
(`work/sop`): print-ready, `?print=1` strips the chrome, noindex. Panels are
inline SVG wireframes, theme-neutral, so the storyboard does not pre-empt D9.

**Tabs (added 2026-10-27).** The page opens on an **Overview** tab: a
five-minute outline in the owner's language (the problem, how a job moves
through in eight steps, what is tracked, who uses it, the screens, Portal,
rollout, what we need from you, what it is not). The **Storyboard** tab is
Part 1 and the **SOP** tab is Parts 2 and 3. Contents links cross tabs.
Two print buttons: **Print this tab** (the Overview alone is a two-page PDF)
and **Print everything** (one PDF, each tab starting a new page).
`?tab=overview|story|sop|tech` opens a tab, `?all=1` shows all four, and
both combine with `?print=1`. The **Tech spec** tab (added 2026-10-27 after
the owner asked what the site runs on and whether a Firestore database stays
readable) is section 16 in the owner's words.

## 16. Tech spec and data readability

The stack is the work site's usual: static HTML on GitHub Pages, Firebase
Authentication with Google restricted to the domain, Cloud Firestore in
`watchtower-6fbe1`, Firebase Storage for photos, browser camera scanning,
browser-printed labels, SheetJS exports, and later a Cloudflare Worker for
Portal. Nothing new to run. D15 keeps Postgres (Supabase) open as the
alternative; the screens are the same either way, offline support is the
cost (section 9 becomes hand-built sync).

**Readability rules.** The owner does not want a database only the app can
read. These are build requirements, checked before each release:

1. Flat collections with plain names (section 3). One collection per kind of
   thing; at most one level of nesting (ticket lines). No encoded blobs, no
   maps-of-maps, no arrays of objects except short chip lists.
2. Field names are English words: `brand`, `model`, `qtyNeeded`, `ftLeft`,
   `holderName`. No abbreviations beyond `qty`, `ft`, and `id`.
3. **Names travel with the record.** Every document that references another
   carries the readable name beside the id, written at the moment of the
   change: `clientName` and `jobName` on tickets, items, and orders;
   `productName` (brand + model) and `locationName` on stock rows,
   containers, items, and every movement; `holderName` and `byName` on
   movements; `ticketNumber` beside `ticketId`. A row reads on its own in
   the console or a CSV. Names are snapshots; renaming a client does not
   rewrite history.
4. Readable document ids where the world has one: `loadout_proposals/{Portal
   number}`, `loadout_products/{brand-model slug}` (`ubiquiti-u6-pro`),
   `loadout_locations/{rack-a3}`, `loadout_tickets/{proposal number}` (or
   `{number}-co2` for a change order). Random ids only for movements,
   shipments, items, and containers, and those carry names (rule 3).
5. A data dictionary: section 3 of this plan is the source; the Console's
   **About** tab renders the same list (collection, field, meaning) from a
   constant in the code, so it cannot drift from the build.
6. **Export everything** in the Console: one CSV per collection, zipped,
   opening in Excel with the headers from rule 2. Phase 0.4.0.
7. Nightly export: loadout-worker writes the same CSVs through its service
   account to the project's own Firebase Storage bucket, under
   `loadout/backups/YYYY-MM-DD/` (one folder per night, 90-day retention),
   and the Console's **Backups** tab lists them for admin and accounting to
   download. Storage, not Google Drive, because the shop's Workspace cannot
   create a Shared Drive and a service account cannot upload into a
   person's My Drive. Worker 0.2.0 with app 0.6.1. Until the worker runs,
   Export everything by hand on Fridays is SOP-10's last step.
8. Reports read the live collections, never a hidden copy.
9. One-for-one SQL mapping: every collection is a table, every field a
   column, every subcollection a table with a parent id. A move to Postgres
   is a copy script, not a rewrite.

**Fixture.** `samples/Unassigned Inventory.xlsx` (ignored, section 17) is
the readability test: the import of it must produce documents a person can
read in the console and a CSV export that round-trips to the same sheet.

**Firestore vs Postgres, for the record.** Firestore: shared sign-in, offline
persistence built in, listeners for the wall board, free tier covers a
five-person shop, console shows one document at a time. Supabase Postgres:
grid view per table, SQL joins for reports, its own auth, no built-in
offline, free tier pauses after a week idle so Pro is the realistic tier.
Settled 2026-10-29 (D15): Firestore with rules 1-9.

## 17. Importing the current inventory sheet

The shop already keeps inventory in a workbook, `Unassigned Inventory.xlsx`
(in `samples/`, never committed). It is the day-one seed and the first real
test of the import mapping. Read on 2026-10-29, and again on 2026-11-05 when
the Devices tab grew pull tracking and serials (the 10-29 copy is kept
beside it under a dated name); what it holds:

| Tab | Rows | What it is | Columns |
|---|---|---|---|
| Patch Cables | 171 | Made-up cables by type and attributes; 31 types (power, stereo audio, Cat6 patch, HDMI, fiber, USB, A/V...) | Type, Make, Part Number, Connector 1, Connector 2, Color, Diameter + Unit of Measure (gauge), Amps, Length + Unit of Measure 2, QTY, Area, Shelf, Last Date |
| Splitters | 15 | Coax, RCA, and 3.5 mm splitters | Type, Make, Part Number, Connector 1, Number of Inputs, Connector 2, Number of outputs, QTY, Area, Shelf, Last Date |
| Devices | 54 (47 on 10-29) | Network, surveillance, speakers, control, racks | 16 columns: Type, Make, Part Number, Description, Color, Condition, QTY, Area, Shelf, Count Date, and from 11-05 Pull Date, UPC, Serial/MAC Device Only, Client Pulled For, Pulled For, Note (two headers hold a line break; the importer reads it as a space) |
| Connectors | 9 | XLR and banana | Type, Make, Part Number, Sex, Band, Pin, QTY, Area, Shelf, Last Date |
| Boxed Cable | 53 | Wire boxes by box code | Box, Type, Wire Type, Color, Purchase Date, QTY (feet left), As of Date, Location |
| Carrier OnhandPricing | 33 | Cable type x color grid with three vendor price columns, almost empty | Type, Grade, Color, Length, and one column per vendor |
| Cable Guide | 5 | Cable type and grade list | Type, Grade |

What the sheet taught the plan (changes already made above):

1. **Most cables and connectors have no make or part number** (143 of 171
   patch cables, 6 of 15 splitters, 6 of 9 connectors). A catalog keyed on
   brand + model cannot hold them. Products now have a `kind`, the sheet's
   `type`, and flat attribute fields; the id and display name compose from
   those when brand and model are blank (section 3).
2. **Locations are two-level**: an Area (Storage room, Computer Room
   Shelving Rack, Computer Room Cabinet, Warehouse, Garage) and a Shelf
   (RCA A/V Video, Power cables, HDMI, USB cables, Patch cables, A, B, C).
   Locations now carry `area` and `shelf` with a composed name.
3. **Wire boxes already have codes** (A826, B626, AA, BB: a letter plus, on
   newer boxes, month and year of purchase). The code becomes the
   container's id and label and goes on the QR sticker; new boxes continue
   the scheme. Feet left is the sheet's QTY; the last reading date is As of
   Date; Purchase Date is kept. Fifteen boxes read zero and two say
   "completed": those import as empty. Thirteen boxes have feet left but no
   location: they import with a "confirm location" flag that the Stock view
   shows until someone scans them onto a shelf.
4. **Every row has a count date** (Last Date, Count Date, As of Date). The
   import writes one `adjust` movement per row, dated from that column, by
   "Import", note "Unassigned Inventory.xlsx, tab X row N", and sets
   `lastCountAt`. The audit trail starts from the sheet, not from nothing.
5. **Condition exists on devices** (new, new in box, used) and maps to the
   item condition field; devices with a condition or a cost above the
   threshold become serialized items at import, one per unit of QTY.
6. **The vendor columns** on the pricing tab seed the vendor list in
   Settings. The prices themselves are empty and are not imported.
7. **Zero-quantity rows stay** as products with on-hand 0, so the catalog
   remembers what the shop stocks.

The 2026-11-05 copy (0.7.0) added six Devices columns, and four more lessons:

8. **UPCs arrive on the sheet.** The UPC column is stored as a number
   (810084690598.0); it lands on `product.upc` as text without the ".0",
   the same fix as part numbers. The sheet's value wins when present; an
   empty cell never clears a UPC learned on Scan.
9. **Serials make units.** A Devices row becomes serialized units when any
   of Condition, Serial/MAC, Pull Date, or Pulled For is filled (before
   0.7.0, only Condition). The Serial/MAC cell is read by shape: set aside a
   leading tag in parentheses ("(AV) ") and any colons, dashes, or dots, and
   if 12 hex characters remain it is a MAC, stored normalized in `mac` with
   the cell as typed kept in `importNote`; anything else is a serial, kept
   exactly as typed in `serial`. The unit id comes from the MAC or the
   serial (section 3), so a re-import finds it. Its label is "Product name,
   MAC" or ", SN" and the last 6 characters. A row with a serial or MAC
   and QTY above 1 gives the identifier to one unit and numbers the rest,
   with a warning. A row without one keeps the "Product name #n" counter,
   so units imported on 10-29 keep their ids and labels.
10. **Pull columns are check-outs.** A row with Pull Date or Pulled For
    comes in checked out: `holderName` is Pulled For as typed (no account,
    so no `holderUid`), `holderNote` is the sheet's Note, the client from
    Client Pulled For is found by name or slug or created, and
    `checkedOutAt` is Pull Date, else the row's count date. Each pulled
    unit gets one `checkout` movement by Import with the same date, keyed
    like every import movement, so a re-import never writes it twice; a
    unit Import has checked out once is never checked out by Import again,
    even if the row moves. Note "DNI/Does Not Exist" means the row counts
    nothing: the product stays in the catalog (lesson 7), with no unit,
    stock, or movement, and a warning names the tab and row. On the
    11-05 copy that row reads QTY 1, not 0; the note wins.
11. **A vehicle is a location.** An Area whose last word is Car, Van, or
    Truck ("<name> Car") imports as a location of kind `vehicle`.

The dry run adds: units with serials and with MAC addresses, pulled units
("checked out to N people for N clients", no names), clients to create,
products gaining a UPC, and vehicles. Warnings name the tab and row, never
the value. A write the database already holds is left out of the plan, so
running the same file twice plans 0 writes the second time.

Normalization the importer applies, shown in the preview before anything is
written:

- Trim, collapse spaces, and fold case on Area, Shelf, Type, Color, units
  ("Storage room" and "storage Room" are one shelf; "grey" and "gray" are
  one color; "foot", "Foot", "feet" are `ft`).
- Make aliases from a small table the user confirms in the preview
  ("Ubiquity" and "Unifi" to "Ubiquiti"); unknown makes pass through as
  typed.
- Part numbers that Excel stored as numbers (13 devices, 5 cables) become
  text without the trailing ".0".
- "N/A" and blanks become empty fields, never the string "N/A".
- Length + unit become `length` and `lengthUnit`; Diameter + Unit of Measure
  become `gauge` and `gaugeUnit`.
- Boxed Cable: Type + Wire Type + Color + grade (from the Cable Guide tab
  when the type names one) compose the wire product; one container per row.

The importer lives at More > Import inventory sheet (admin only), built in
0.1.0: drop the .xlsx (SheetJS reads it in the browser), pick the tab-to-kind
mapping (prefilled for these seven tabs), review a dry-run report (products
to create, locations to create, boxes, items, rows skipped and why, the alias
table), then Import. Re-running it on a newer copy of the sheet updates
counts and adds new rows; it never duplicates, because the ids are
deterministic (section 3). The same screen takes a plain CSV with the same
columns for later bulk edits.

Open: D16 (start length per box) and D17 (assigned inventory).

## 18. Simple mode: organize the app around the three jobs (user, 2026-11-05)

After the first test drive on real data the user said Stock, Units, and the
Console are confusing, and that the app has to be simple for three people:
the one doing inventory, the one pulling product for a job, and the one
confirming the product made it to the client. Today the navigation is
organized by data type (Tickets, Week, Scan, Stock, More with Orders,
Tracking, Units, Console, Movements, Clients, Jobs, Labels, Import). The
fix is to organize it by job.

### 18.1 Words

- "Ticket" goes. In warehousing the paper is a **pick list** or **pick
  ticket**; AV and low-voltage integrators say **pull sheet** and talk about
  "pulling for a job"; field-service shops say **kit**. The shop already says
  "pull product for a job", so the app says **Job** for the thing and **Pull
  sheet** for its lines. Ticket number becomes the job number; the proposal
  number stays beside it.
- The three steps a job goes through are verbs the shop uses: **Pull**
  (from the shelf to the bay), **Stage** (sitting in the bay, ready),
  **Deliver** (on site, confirmed). Lines keep the same states; only the
  labels change.
- **Shelf** replaces both Stock and Units: one list of what the shop owns.
  A product with serialized units expands to show each unit (serial, MAC,
  where it is or who has it). "Out with people" is a tab on Shelf, which is
  the old Units > Out list.
- **Office** replaces More + Console: one screen with sections (Orders and
  tracking, Clients, Reports, People, Settings, Labels, Movements, Import,
  Backups, Export, About). Warehouse and tech roles see only the sections
  they can use (Labels, Movements, About).
- **Count** is the inventory job: pick a shelf, see what should be there,
  confirm or correct each line, done. It is new; today counting means
  editing stock by hand.

### 18.2 Home by role

| Role | Home shows | First action |
| --- | --- | --- |
| warehouse | three doors (Count a shelf, Pull for a job, Confirm a delivery) over the jobs list | Pull for a job |
| tech | jobs with product out with me, plus Confirm a delivery | Confirm a delivery |
| admin | the jobs list with progress strips, Office in the tab bar | New job |
| accounting | Office > Reports | Reports |

Every job card carries one progress strip (Pulled 3 of 8, Staged, Delivered)
and one next-action button (Keep pulling, Stage, Confirm delivery), so a
person never has to pick from five row actions.

### 18.3 Options for the user to pick (switcher: simple-preview.html)

- **A. Three doors (recommended).** Home = three big buttons for the three
  jobs, the jobs list under them. Tab bar: Jobs, Scan, Shelf, Office.
  Reason: the three people the user named each see their door first;
  nothing else competes.
- **B. Jobs first.** Home = the jobs list with progress strips and one
  next-action button per card; Count lives under Shelf. Same tab bar.
  Reason: fewer screens; relies on the strip to carry the three steps.
- **C. Scan first.** Home = the camera. A shelf label starts a count, the
  QR on a printed pull sheet opens the job mid-pull, a delivery is confirmed
  from the job. Lists sit behind a search field. Reason: fastest with a
  phone in one hand; worst for the office.

Word choice is a second switch inside the file: Pull sheet / Pick list /
Job order, so the user can read each screen with the word the shop will use.

### 18.4 What does not change

Data model, ids, rules, the importer, the worker, the wall board, Week,
Orders and Tracking (they move under Office), labels and QR codes. This is a
navigation and wording release, plus the new Count flow.

### 18.5 Decided (user, 2026-11-05: "lets try it")

- D18 Option A, Three doors. The user's own fallback idea was "a landing
  page with a few buttons with colors that state job functions", which is
  A, so the doors carry three distinct colors by job (Count, Pull, Deliver)
  taken from the existing status colors, and each job's screens wear the
  same color as a thin band so the color means the same thing everywhere.
- D19 The word is Pull sheet; the thing is a Job.
- D20 No blind count in the first version; the expected number shows faint.
- Build: 0.8.0 on Opus after the user has seen simple-preview.html.

### 18.6 Wall board as a grid (user, 2026-11-05)

The user does not want the TV cycling one job at a time. The board becomes
a **grid of six job cards, three across and two down**, and rotates only
when there are more than six jobs to show (then page by page, at the saved
rotation interval, with a page dot row at the bottom). Fewer than six: the
cards grow to fill the screen; one job fills the whole screen as today.

Each card: client and job name, job number, bay, the progress strip
(Pulled 3 of 8, Staged, Delivered) with the Pull door color as its band,
then the lines still to pull grouped by shelf in pick order, pulled lines
greyed, on-order amber, and "+N more lines" when the card runs out of room.
Pinned jobs come first, then open jobs by install date. Legible at three
meters: card title 32 px, lines 24 px, nothing under 22 px. `?board=1` and
`?demo=1&board=1` and the `mode=` switch keep working.

### 18.7 Audit, and the pick-up step (user, 2026-11-05, during the 0.8.0 build)

- **Audit** replaces Count everywhere: the door says **Audit a shelf**
  (verb and object, like the other doors), the screen and the Office
  section say Audit, the location field says "Last audited". The movement
  note says "Audit". Nothing else about the flow changes.
- **Pick up** is a missing step. Today "Deliver to site" does two things at
  once: the tech takes the staged product out of the bay, and it is
  confirmed at the client. The shop wants them apart, because product sits
  in a van between the two and someone should be on the hook for it. The
  four steps of a job are now **Pull, Stage, Pick up, Deliver**:
  - Line state `picked_up` sits between `staged` and `delivered`, with
    `pickedUpAt`, `pickedUpBy`, `pickedUpByName` on the line and on the job
    (`TK_STATUS` gains `picked_up`, label "Picked up"). Serialized units on
    those lines are checked out to that person at pick-up (the `checkout`
    movement that deliver writes today moves here); deliver then marks
    them installed as it does on close today, or leaves them checked out
    until the job closes, whichever the current deliver code does.
  - A new door **Pick up from staging** ("Take a job's staged product into
    your van; it is yours until it is delivered") for tech and warehouse.
    It lists jobs with staged lines; on a job, tick the lines you are
    taking (all by default), **Pick up** writes one `pickup` movement per
    line (type added to the movement list and the data dictionary) and the
    unit check-outs.
  - **Confirm a delivery** lists jobs with picked-up lines first, then jobs
    with staged lines (the warehouse delivering straight from the bay),
    and confirms either.
  - **Out with me** (tech home) shows picked-up lines by job as well as
    units, since that is what sits in the van.
  - Progress strips and the TV board cards read Pulled, Staged, Picked up,
    Delivered. The board greys picked-up lines like pulled ones and labels
    them "In the van".
- Door colors: Audit blue, Pull amber, Pick up the dark slate of the app's
  text color (white on it), Deliver green. Red stays for Short only.
- Door order (user, 2026-11-05): most used on top. Warehouse Home: **Pick
  up from staging**, **Confirm a delivery**, **Pull for a job**, **Audit a
  shelf** last. Tech Home: Pick up, Confirm a delivery. The band colors and
  the order of steps in the progress strip do not change.

## 19. Ideas from Sortly and Zoho Inventory (user, 2026-11-09; not scheduled)

The user shared Sortly (sortly.com/features) and Zoho Inventory screens as
reference. Nothing here is scheduled; the owner's test drive comes first.
Ranked by fit:

1. **Counts on the doors (Zoho's dashboard counters).** Zoho's home is four
   counters: To be packed, To be shipped, To be delivered, To be invoiced.
   That is Loadout's job steps. Each door on Home shows its count: "Pick up
   from staging, 3 jobs waiting", "Confirm a delivery, 2 in vans", "Pull
   for a job, 4 open", "Audit a shelf, 5 shelves over 60 days". Small
   build, strong payoff: a person sees whether there is work behind a door
   before tapping it. Built in 0.8.2 (the count is the length of the list
   behind the door; zero reads grey, such as "Nothing staged").
2. **Chain scanning (Sortly's Quick Action).** Scan a location label, then
   scan items, and each item moves there; a sticky card at the bottom shows
   the target. Loadout has location labels and unit QR codes already, so
   Scan gains a "Move to" mode: first scan sets the destination, following
   scans move units or boxes with one `move` movement each. Also the fast
   way to audit a shelf of serialized units (scan each, the rest are "not
   here"). Medium build.
3. **Admin summary on Home (Sortly's dashboard).** One strip above the jobs
   list for admin and accounting: on hand value (when costs are on), low
   stock count, units out with people, jobs in vans, plus the last five
   movements. Everything exists in Reports and Movements; this is a
   digest. Small build.
4. **Location tree on the desktop (Sortly's folder sidebar).** Shelf >
   Locations on a wide screen as an area > shelf tree on the left with the
   products of the chosen shelf on the right. Loadout has flat area+shelf
   locations, so the tree is a view, not a model change. Medium build.
5. **Label preview in search results (Sortly).** A search hit shows the
   label as it prints (name, QR). Loadout's Labels section prints sheets;
   a per-row "Print this label" from Shelf is the useful half. Small.

Not borrowing: photos as the first column (the shop's catalog has few
photos; the name and part number carry the row), tags (kind, type and
attributes already do this), prices on every row (costs are off per D7
until the owner wants them), folders as the data model (locations and
jobs stay flat per section 16), and the red accent (the door colors and
Ledger tokens stay).

## 20. Review of 0.8.2 by role, and release 0.9.0 (2026-11-11)

The user asked what else the design needs. I walked the demo as warehouse,
tech and admin on a phone and read the code behind each door. The doors are
simple; what sits behind two of them is not, and two jobs the shop does
every week have no door at all.

### 20.1 Findings

1. **The Pull door leads to the office page.** Pick up and Confirm a
   delivery each open a focused screen (the lines, a tick each, one button).
   Pull opens the full job page: nine header buttons, six info blocks, a
   five-tile summary, a four-chip summary, five numbers per line, the
   timeline, the Portal note. That page is right for the office and wrong
   for the person with a box in one hand. This is the confusion the user
   named after the first test drive, one level down.
2. **Product in a van has no way back.** Pick up takes product out of the
   bay onto a person. If the job is postponed or a line is not needed, the
   only exits are Deliver and the "Left in the van" note. Close job returns
   or writes off what is left in the bay and ignores what is in a van.
   Inventory would drift on the first postponed job.
3. **Receiving has no door.** Receiving a shipment is the first SOP and the
   only way stock gets in, and it sits at Office > Orders and tracking >
   Tracking, behind a purchase-order table.
4. **"Delivery" means two things.** The door says Confirm a delivery (to the
   client); the carrier status says "Delivered, not received" (to the shop).
5. **The progress line reads zeros.** "Pulled 2 of 9, Staged 2, Picked up 0,
   Delivered 0" makes a person read four numbers to learn one.
6. **The Pull count mixes two things.** Jobs with something to pull now and
   jobs only waiting on orders count the same.
7. **The printed pull sheet has no QR.** Paper on a clipboard is how a pull
   starts; the phone should open that job from the paper.
8. Carried: shipment Receive does not ask for serial or MAC; the data
   dictionary lacks `loadout_settings/worker`; the tech rules from 0.8.0
   were never run in the emulator.

### 20.2 Decisions (Fable, for 0.9.0)

- **Pull gets its own focused screen**, `#pull/<jobId>`, the same shape as
  Pick up and Deliver: client, job, bay; the progress line; lines grouped by
  **where to pull from, in pick order** (the TV board's order), not by the
  client's room; each line is the product, the quantity, and one button
  ("Pull 4"). A line the shelf cannot cover sits in a quiet "Waiting on
  orders" group with its PO status and no button. Pulled lines drop to a
  ticked "In the bay" group. "Open the job" goes to the full page, which
  stays as it is for the office. Every "Keep pulling" goes here.
- **Bring back.** Out with me and the Deliver screen gain "Bring back to
  the shop": tick the lines, pick where they go (the job's bay by default,
  or a shelf), and they leave the person's name. Close job lists what is
  still in a van beside what is in the bay and will not close until each is
  delivered, brought back, or written off.
- **Receive a shipment** becomes a door for warehouse and admin, fourth,
  above Audit: "2 arrived, 3 on the way". Its screen lists arrived
  shipments first, then in transit; Receive asks where it goes (the job's
  bay when the line belongs to a job) and, for a serialized product, the
  serial or MAC of each unit.
- **One word, one meaning.** A carrier drop at the shop is **Arrived**:
  "Arrived, not received". Deliver and Delivered mean the client's site
  everywhere.
- **Progress line names only what is non-zero**: "Pulled 2 of 9, Staged 2";
  "Delivered 2 of 2" when a job is done. The bar keeps all four segments.
- **Pull door and list split**: "3 jobs to pull, 2 waiting on orders"; the
  list shows pullable jobs first and the waiting ones under a quiet heading.
  A job with nothing pulled says "Start pulling".
- **QR on the printed pull sheet** (`loadout:job:<id>`): Scan opens that
  job's Pull screen.
- Carried items 8 are done in the same release; the rules for tech pick-up,
  delivery and bring-back get an emulator run.

Not in 0.9.0: chain scanning, the admin summary strip, the desktop location
tree (section 19 items 2 to 4), and any change to sign-in, which waits on
the user's iPhone home-screen test.

**Built in 0.9.0 (2026-11-11), with these notes:**

- Pull screen: built as decided. A line's share per shelf follows Pull
  everything in stock (the product's own shelf first, then the most stock),
  and two lines of one product share a shelf's count. Groups sort with the
  board's pick order, now one shared function (`pickOrder`). Non-catalog
  lines sit under Waiting on orders. Waiting cards on the Pull list say
  "See what is waiting". Pull list card headers also open the Pull screen.
- Bring back: built, with one narrowing. A **tech brings back to the job's
  bay only**; the shelf choice is warehouse and admin. The rules let a tech
  raise a count only in a location of kind `bay`, so "a tech cannot write
  stock on a shelf" stays provable. Serialized units in a van are taken as
  the line's checked-out units less those already delivered (units stay
  checked out until close, so the app cannot tell which unit was delivered).
  Close job: warehouse sees the block sentence and a disabled Close job;
  admin gets Not yet / Write off radios.
- Receive door: the colour is the neutral pill grey `--m-pilltext` (#4f5a68;
  white 7.01:1, the quiet grey 5.65:1). There is no teal token, and the
  only purple is the FedEx carrier chip, which would read as FedEx. The
  serial and MAC fields are optional, as on Shelf; more lines than units
  is refused. Only boxes coming to the office are listed (a site box is
  never received).
- Arrived: the job-site Mark delivered is also Mark arrived (a carrier drop
  at the site), and the site pill reads "Arrived at the site", so no carrier
  status uses Delivered. "Out for delivery" stays: it is the carrier's own
  status word.
- Progress line order: Pulled N of M, then Delivered, Picked up, Staged,
  furthest along first, matching "Pulled 3 of 3, Picked up 2, Staged 1".
- Emulator: Pick up, Confirm a delivery, and Bring back ran as the exact
  batches the demo app wrote, 14 of 14 checks passed. The 0.7.0 unit
  check-in fields were not part of the run.

### 20.3 The wall board on a phone (owner, 2026-11-11, built in 0.9.0)

The board was built for a 16:9 TV: a 3 by 2 grid, 32 px titles, paging. On a
phone it is unreadable. On a narrow screen (under 760 px wide, or a coarse
pointer in portrait) it switches to a phone layout:

- One column of job cards, full width, scrolling like a page: no paging,
  rotation bar, page dots, auto-scroll, or burn-in shift; every line of
  every job (no "+N more lines").
- Phone type: card title 18 px, lines 16 px, nothing under 14 px. Same
  themes (dark and light) as the TV, the progress line and the amber band
  on each card, lines grouped by shelf in pick order, picked-up lines grey
  as "In the van", on-order amber.
- Order: the board's own list (pinned jobs first, then by install date in
  Every open job mode).
- A slim sticky header: "Board", the mode name, and Live or "Not live since
  8:14 AM" (the red TV strip does not show), with safe-area insets top and
  bottom.
- Read-only. A signed-in role other than Board gets one "Open in Loadout"
  link per card: `#pull/<id>`, or `#job/<id>` for a role that does not pull.
- The TV layout is unchanged at 760 px and wider; a resize or rotation
  switches layout. `?board=1`, `?demo=1&board=1`, and `&mode=` keep working;
  `&layout=tv|phone` forces either, in the demo and in the real app.

Built in 0.9.0: checked at 360, 375, and 412 wide (no horizontal scroll, all
seven demo jobs reachable, smallest text 14 px, dark and light), and at
1600 by 900 (3 by 2 grid, page 1 of 2, rotation bar on).

## 21. Shelf filters (0.9.1) and product photos from a UPC (idea)

### 21.1 Shelf filters (user, 2026-11-11; build as 0.9.1)

Shelf has tabs, a Consumables toggle and search, and no way to narrow by
what a product is. With 268 products the list needs it.

- Four filters, each "All" by default: **Category** (the product's own
  free-text `category`, such as Network, Audio, Cable, Wire; compared
  without regard to case or extra spaces and shown in the spelling most
  products use; a product with an empty category falls under its kind's
  plain label: Devices, Patch cables, Splitters, Connectors, Wire, Other.
  `kind` itself is internal), **Type** (the sheet's Type values, narrowed to
  the chosen category), **Brand** (compared the same case-blind way),
  **Location**. Consumables only moves in beside them as a fifth
  toggle. Every option shows its count and only values that exist appear.
- Desktop: the filters sit in one row at the top of Shelf, above the table.
  Phone: one **Filter** button beside search that opens the app's bottom
  sheet; it reads "Filter, 2" when two are on.
- Active filters show as chips under the search field, each removable, with
  "Clear filters" at the end. Filters combine with the tab and the search.
- They apply to All and Low. Out with people and Locations keep their own
  lists.
- Filters last for the session and reset on reload; a filter that silently
  survives a week hides products from the person looking for them.
- Empty result: "No products match these filters." with Clear filters.

Built in 0.9.1: the row of selects shows when the Shelf card is wider than
720 px, the Filter button below that; option counts are worked out with the
other filters applied, so every count equals the rows it shows; Location
means stock there (counted rows, open boxes, units in stock or staged), or
the default location for a product with nothing on hand. Consumables only
is a session filter too and left the address.

### 21.2 Product photos from a UPC (not scheduled; findings 2026-11-11)

Today a photo is taken or picked by a person on the product's panel and
stored in the project's Storage bucket. Nothing looks a photo up.

Tested: the free UPCitemdb lookup (100 lookups a day, no key) returned the
right product and two retailer photos for a real networking UPC from the
shop's sheet, and the wrong product for a well-known sample barcode. So it
finds name-brand devices and cannot be trusted blind. A browser cannot call
it (it only allows its own site), so the lookup has to go through
loadout-worker.

Limits: only products that carry a UPC can be looked up (a handful today;
the 143 patch cables with no make or part number never will), the photos
are retailer images linked from other sites (copy the chosen one into
Storage, never hotlink), and a match must be confirmed by a person.

Shape if built: on a product with a UPC and no photo, a **Find a photo**
button (admin and warehouse) asks the worker, shows the name it found and
up to four photos, and the person picks one or none; the worker copies the
pick into Storage. A bulk "Find photos for N products" on Office runs the
same thing as a review queue. For everything without a UPC: the phone
camera as today, plus a plain drawn icon per category so rows are not
blank.

### 21.3 History as a vertical timeline (user, 2026-11-11; build in 0.9.1)

"Show history" on a product, unit or location, the Timeline on a job and a
PO, and "Last movements" all draw the same four-column text rows (when,
who, type, what). The user wants it to read as a timeline.

- One shared component, so every history looks the same: a vertical rail
  down the left with a dot per event; events grouped under day headings
  (Today, Yesterday, then the date) with newest first.
- Each event: the time, the verb as its heading (Pulled, Staged, Picked up,
  Delivered, Brought back, Received, Arrived, Audited, Corrected, Cut,
  Reading, Checked out, Checked in, Moved, Written off, Edited), one plain
  sentence of what happened (product, from where to where, for which job),
  and who did it. The quantity sits at the right as a signed number for
  counted stock ("-4", "+100", "-180 ft") and is absent for edits.
- The dot's color is the movement family, using the colors the type labels
  already have: into the shop green, moving toward a job blue, corrections
  amber, write-offs red, edits grey. Color is never the only signal: the
  verb heading carries the meaning.
- A unit's history also shows where it is now as the first, open-ended
  entry ("Now: with Tech, job 1058, since Nov 9" or "Now: Warehouse").
- Long histories show the latest 40 with "Show older" (20 more a tap).
- Phone: time and who drop under the sentence; nothing scrolls sideways.
  Print keeps the rail as a thin line.

Built in 0.9.1: `timelineHTML` and the `.tl` styles, so all five callers
changed at once; `MV_VERB` sits beside `MV_LABEL`, which tables and exports
keep. Families: receive, check in, return, Brought back, and Audited green;
pull, stage, pick up, deliver, check out, and move blue; reading, cut, and
adjust (Corrected) amber; write-off red; edit and note grey. A move and an
arrival show a plain number, since they change where stock is, not how
much. The product, unit, and location history keeps every row it reads
(it stopped at 25), and the PO Timeline every row (it stopped at 30); Last
movements on the Scan card stays at five.

### 21.4 Photo from a UPC, decided (user, 2026-11-11): build as worker 0.3.0 + app 0.10.0

The user's shape replaces the "Find a photo" idea in 21.2: **the moment a
UPC goes onto a product, look the photo up and ask.**

- **When it asks.** Right after a UPC is saved on a product: Scan's "Set
  UPC" and "Link to a product", the UPC field on the product panel, and New
  product. Products that already carry a UPC get a "Find a photo" button on
  their panel, and Office > Import shows "Review photos for N products"
  after an import adds UPCs. Never automatic, never silent.
- **What it shows** (one sheet, "Photo for this UPC"): the name and brand
  the lookup found, set beside the product's own name; a plain warning when
  they do not share a brand or model word ("The lookup calls this ...;
  check that it is the same product."); up to four photos to choose from.
  - No photo on the product yet: **Use this photo** / **None of these**.
  - A photo already there: the current photo beside the found one, **Keep
    the current photo** / **Replace it with this one**.
  - Nothing found, or the lookup is unreachable: one line saying so and
    Close; the UPC is saved either way.
- **What it stores.** The chosen photo goes through the app's existing
  upload (resized, into the project's Storage, same rules as a camera
  photo), never linked from the retailer. The product records
  `photoSource: "upc"`, and `upcLookupAt` / `upcLookupResult` (used, none,
  kept, not_found) so the same UPC is not asked twice; the panel's button
  can ask again.
- **How it is fetched.** A browser cannot call the lookup service, so
  loadout-worker gains two signed-in endpoints: `GET /upc/lookup?upc=`
  (name, brand, model, photo count) and `GET /upc/photo?upc=&i=` (the photo
  bytes, images only, size-capped), both requiring a Firebase sign-in whose
  roster role is admin or warehouse, both answering only to the app's own
  address. The worker fetches a photo only from the list that UPC's lookup
  returned, so it cannot be used to fetch arbitrary addresses.
- **Limits to say plainly in the app.** The free lookup allows 100 a day
  and is shared with other users of the hosting network, so "Lookup is busy,
  try again later" is a normal state; it knows name-brand boxed products
  and little else; photos are retailer product shots, for this internal
  tool only.
- Demo mode answers from fixtures with drawn placeholder pictures marked
  Demo and makes no network call.

Built in 0.10.0: `openUpcPhoto` (one sheet, states looking, found, not found,
busy, unreachable, offline, not allowed), `offerUpcPhoto` called from
`doSaveProduct` whenever a UPC is newly saved (so Set UPC, Link, the panel
field, New product, and Edit product all ask), Find a photo on the panel of
any product with a UPC, and Review photos for N products in the import done
box with Skip the rest. Photos come through `fetch()` with the ID token and
show from blob URLs revoked on close; a chosen one goes through `doSetPhoto`
(same 1200 px JPEG, same path, same Storage rules), which now also writes
`photoSource` (`camera` or `upc`). One field beyond this section:
`upcLookupUpc`, the UPC an answer was about, because "the same UPC" cannot
be told otherwise. The mismatch test compares the product's brand and model
words (its name's when it has neither) of four or more characters with the
lookup's title, brand, and model. Rules unchanged: admin and warehouse
already write any product field. Not done here: the plain drawn icon per
category from 21.2, and any bulk lookup outside the import queue.

## 22. New job, made plain (user, 2026-11-11; build in 0.10.0)

The user: "New job, import a Portal CSV" confuses employees, most of all
the ones with no Portal access. Today the sheet opens on two tabs, "Import
a Portal CSV" (the default) and "Build by hand", and the import tab shows a
column-mapping table before anything else. It assumes the person knows what
Portal is, what a CSV is, and where to get one.

### 22.1 Decisions

- **Say what a job is, once, at the top:** "A job is the list of product
  one client's install needs. Loadout uses it to show what to pull, what to
  order, and what was delivered."
- **Two plain choices instead of two jargon tabs**, each a large card with
  a sentence:
  1. **Make the list yourself.** "Pick products from the shelf list and
     type how many. For service calls and small jobs." First and
     preselected for the warehouse role.
  2. **Use a proposal file.** "The office downloads this from Portal when a
     client accepts a proposal. If someone sent you a file ending in .csv,
     choose this." First for admin. Under it, for people without Portal:
     "No file? Ask the office to send the proposal file, or make the list
     yourself." A "Where the file comes from" disclosure holds the three
     Portal steps for the office.
  The word CSV appears only as "(.csv)" after "proposal file". Buttons and
  empty states say "New job", never "Import a Portal CSV".
- **Make the list yourself, in three short steps:**
  1. *Who it is for*: client (pick one or type a new name), job name with
     an example ("Service call, lobby TV"), install date and bay, both
     optional.
  2. *The list*: one search field over the shelf list, a Scan button beside
     it, tap a product to add it, a minus/plus stepper for the quantity
     (feet for wire). Each added line shows what is on the shelf ("12 on
     the shelf" / "Only 2 on the shelf, 4 will be short"). "Not on the
     list? Type it" adds a note line. Rooms are optional: "Group by room"
     reveals the area field, hidden by default.
  3. *Check and create*: the list with its totals in one sentence ("7 lines:
     5 on the shelf, 2 to order"), **Create job**, which lands on the job's
     Pull screen for people who can pull.
- **Use a proposal file, without the mapping wall:** choose or drop the
  file, then "Here is what the file says": client, job, and the lines in
  plain words, each marked *On the shelf list*, *New to Loadout (will be
  added)*, or *Kept as a note (no brand or model)*. The column table shows
  only when Loadout could not find the columns it needs; otherwise it sits
  closed under "Something look wrong? Fix the columns". Skipped rows sit
  closed under a count. Pasting text stays, under "Paste the text instead".
- **Admin only, one line:** when the Portal connection is on, "Accepted
  proposals arrive here on their own; look for jobs marked To review."
- Nothing about what gets written changes: same ids, same line fields, same
  saved column map, same re-import behavior, Add lines to an existing job
  uses the same two choices.

Built in 0.10.0: the sheet rebuilt around the same `I` state and
`createTicket()`; a picked product carries its id into `handLines()`, which
otherwise matches typed text as before, so a demo write for the same input
names the same collections, ids, and fields as 0.9.1. Choices made in the
build: the stepper moves an each product by 1 and wire by 50 ft; the hand
path asks no proposal number (a made-up one, as 0.9.1 with the field blank)
and no address; the file path asks for both; a client with no open jobs
goes straight to a typed job name. Create job lands on `#pull/<id>` for
warehouse and admin and `#job/<id>` otherwise; an update to an existing job
stays on the job page. The "Accepted proposals arrive here" line shows for
the admin when the Portal tier is t1 or t2. Scan opens a small scanner sheet
over New job (camera where there is one, a typed code always), not the Scan
tab. The sheet asks before X, Cancel, Escape, or the handle throw typed work
away (a guard on `closeModal`).

### 22.2 The last tab's name by role (user, 2026-11-11; build in 0.10.0)

The user asked whether Office should be called Settings, or whether it is
an admin view. It is neither: every role has the tab and sees its own
sections, and Settings is one section inside it. Decided: the tab, its
screen heading, its crumbs and every message that names it read **More**
for the tech role (Labels, Movements, This phone, About) and **Office**
for admin, warehouse and accounting. One helper returns the word for the
signed-in role so no string hard-codes it; hashes stay `#office/...` for
everyone. The storyboard says "Office (More for techs)" once and uses
Office after that.

Built in 0.10.0: `officeWord()` beside the account block code; the nav and
tab bar labels are `data-ow` spans it fills, and the Office screen heading,
crumbs, Back to, the Orders and tracking crumb, the Labels toasts, the
reprint hint on Scan, the This phone strings, and the Movements report hint
use it. The sign-in screen names no tab ("This phone, under the last tab"),
since no role is known there. Still saying Office on purpose: the ship-to
choice and Tracking's Office column (the place, not the tab), and the
admin-only explanations (People's role tooltip, Settings' Show costs, the
data dictionary's notes on admin sections).

## 23. A report for one job (user, 2026-11-11; build in 0.10.0)

The user asked whether Reports can show all the product for one proposal or
job. Not today. Delivered has a "By client and job" view, but it lists only
what was delivered inside the date range. The full picture of a job lives
on the job page, which accounting cannot open and which does not export.

**Job report**, a new report beside Delivered:

- Pick the job by client, job name, job number or proposal number (one
  search field; the latest twenty jobs listed under it). A job page gains
  "Open as a report" for admin and accounting.
- One row per pull sheet line: room, product, brand and model, needed,
  pulled, staged, picked up, delivered, brought back, still to order, the
  PO and its status, and with costs on the unit cost and the line total.
  Serialized units list under their line with serial or MAC and where each
  is now. Wire shows feet and the boxes it was cut from.
- A header block: client, job, proposal number, bay, install date, status,
  who pulled, picked up and delivered, with dates. A totals row. With costs
  on: product value needed, delivered, and still out.
- Views: Every line (default), Only what is not delivered yet, Only what
  was ordered. Sort, Columns, CSV and XLSX export, and Print, like every
  other report. No date range: a job is whole.
- Open to admin and accounting, like the rest of Reports.

Built in 0.10.0: `REPORTS` gains `job` beside Delivered, drawn by
`jobReportHTML` in the same frame without the date range. Pulled is the
line's `qtyStaged` (everything taken off a shelf or a PO for it), Staged
is what is in the bay now, Picked up the larger of picked up and
delivered, Brought back the sum of the line's "Brought back" moves, Still
to order `uncoveredFor()`. Unit cost is the PO line's when there is one,
else the product's last cost. Units and box cuts are sub-rows (a
`subRows` option on `tableHTML`, plus a `foot` totals row); a cut written
without its line id goes to the job's line for the same product. The job
search remembers the last job for the session (sessionStorage). Rules:
lines and units are read by every role on the domain, accounting
included, so nothing changed.

## 24. Who is signed in, in the header (user, 2026-11-11; build in 0.10.0)

Today the footer says "Signed in as <email>, Role: Admin" and the header
has the sync pill and a Sign out button. The user wants the role up top by
the name, under the sync pill, and out of the footer.

- **Header, right side, one account block**: the sync pill on the first
  line with the person's name beside it; the role on the second line under
  them, in the muted text color ("Admin", "Warehouse", "Tech",
  "Accounting"). The whole block is one button that opens a small Account
  sheet: name, email, role with one sentence on what the role can do, and
  **Sign out**. The bare Sign out button leaves the header, so a stray tap
  cannot sign a person out mid-pull.
- **Phone**: the pill, with the role under it; the name lives in the
  Account sheet. The block is a 44 px target and the header keeps its
  48 px shrinking behavior. Nothing wraps or pushes the logo.
- **Footer**: version only. The "Signed in as" and "Role" lines go.
- Demo mode shows the demo role there the same way; the board has no
  header and is unchanged.
- **The mark goes Home** (owner, 2026-11-11, added during the build): the
  Loadout mark and name at the top left are one real link, `<a href="#home">`
  with `aria-label="Loadout, go to Home"`, 44 px tall on the phone, with the
  focus ring. From any screen it lands on `#home` (accounting on Office,
  Reports and the board role on the board, as `#home` already does); on
  Home it scrolls to the top. A relative hash, so the demo keeps its query
  string. It does not change the header's height or push the account block.

Built in 0.10.0: `#acctBtn` holds the sync pill, the name, and the role;
`openAccount()` is the sheet (the role's sentence comes from `ROLE_WHAT`),
and Sign out (Leave the demo in demo mode) is its confirm button. The
footer keeps only the version; its sync text went with the rest, since the
pill above says the same. Demo shows "Demo, Warehouse" under the pill.
The mark is `#brandHome`; a click while already on `#home` (no hashchange)
scrolls to the top. Measured: 61 px header and 48 px shrunk at 360, 375,
and 456 px for all four roles, the same as 0.9.1; on a desktop the header
is 61 px, 3 px taller than 0.9.1's 58 px (the 44 px account block and mark).

## 25. Brand and category as pick lists (user, 2026-11-11; build as 0.11.0)

Brand and category are free-text fields today, so the same brand can be
saved three ways and a filter shows it three times. The user wants drop-down
choices on add and edit, matched without regard to case, new values added
as people go if they are an admin, and stored with correct capitals.

- **Pick or type.** On New product and the product panel, Brand and
  Category are comboboxes: typing narrows the list of values already in
  use (each with its product count); picking one saves that value's stored
  spelling. Matching ignores case and extra spaces, so "sonos", "SONOS" and
  " Sonos " all land on "Sonos". Type keeps its text field with the same
  suggestions, narrowed to the chosen category.
- **New values, admin only.** When nothing matches, an admin sees "Add
  'middle atlantic' as a new brand". It opens a small confirm with the name
  already formatted and editable: "Save as: Middle Atlantic". Other roles
  see "Not on the list. Ask an admin to add it." and cannot save a new
  value; they can leave the field empty.
- **Capitals.** A word typed all lower case, or all upper case and longer
  than four letters, gets a capital first letter and lower case after
  ("UBIQUITI" becomes "Ubiquiti"). A word with capitals inside it or four
  letters or fewer in upper case is kept as typed ("QSC", "URC", "iPort",
  "HDMI"). Small joining words (of, and, the) stay lower case inside a
  name. The admin sees the result before saving and can correct it.
- **One list, used everywhere.** The same lists feed the Shelf filters, the
  Stock report's By category view, the inventory importer and the proposal
  file reader, so a file that says "SONOS" lands on "Sonos". The importer's
  saved make aliases keep working and feed the brand list.
- **Tidy what is there.** Office > Settings gains "Brands and categories":
  both lists with counts, **Rename** (rewrites every product that carries
  the value, in batches, with one movement-style note in the history), and
  **Merge** one entry into another. Entries that differ only by case or
  spacing are flagged at the top as "Probably the same".
- `kind` stays internal and unchanged. Product ids do not change when a
  brand is renamed; the readable name is rebuilt.

**Built in 0.11.0** (2026-11-11, not committed). Everything above, with these
choices and notes:

- An admin who types a new value and presses Save (without choosing Add from
  the list) gets the same confirm; Cancel leaves the field refused with
  "Not on the list yet. Add it, pick one from the list, or clear the field."
- The confirm's hint reads "Fix the capitals if this is not how the maker
  writes it." for a brand and "Fix the capitals if this is not how it should
  read." for a category, since a category has no maker.
- A lower-case word with a digit ("c2g") becomes "C2g"; a short upper-case
  word with a digit ("C2G") stays. The admin corrects the rest in the confirm.
- Brands and categories is its own address (`#office/lists`), linked from a
  section on Settings, with no card on Office. "Probably the same" lists a
  value saved more than one way that differs only by case or spacing (one
  list entry already, since the lists key on `normKey`); "Look alike" groups
  entries that match once punctuation, spaces, and a trailing s are dropped.
- Rename and Merge rewrite `name` only when it was built from the brand
  (rebuilt) or carries the old spelling (swapped in place); a category is not
  part of the name. Stock rows, units, and lines keep the product name they
  were written with, as everywhere else (names are snapshots).
- The inventory importer starts a new make tidied in the alias table (the
  Becomes box is where the admin corrects it) and adds new makes to the
  brand list. New categories from an import are not added to the lists
  document; they are on the list because a product carries them.
- Not done: nothing in this section is left out. A failed batch part way
  through a run was checked by reading the code only; the demo refuses every
  write, so it cannot fail half way.

## 26. A delivery animation (user idea, 2026-11-11; NOT scheduled, awaiting a choice)

The user asked for a "3D Grand Theft Auto type" animation when product is
delivered, cheaply, with an estimate first. Token figures are from this
project's own builds (0.8.2 door counts: about 200k Opus tokens; worker
0.3.0: about 140k; 0.9.0: about 625k). Fable's share is the brief and one
review, about 15k to 25k each time.

| Option | What it is | Opus tokens | Risk |
| --- | --- | --- | --- |
| A. Top-down drive | A small top-down city block drawn in canvas, the van drives from the shop to a house, a box drops, a banner reads "Delivered" with the job. About 3 seconds. No library. This is the look of the first two GTA games. | 80k to 150k | Low |
| B. Low-poly 3D | A real 3D scene (three.js): van, road, house, camera swing, box drop, banner. | 250k to 400k | Medium: a library to load and cache offline, slow phones, hard to check without screenshots |
| C. CSS 3D card | The banner alone, tilted and stamped, no scene. | 40k to 70k | Lowest, least fun |

Rules for any of them: an homage, not a copy (own wording, own font, no
game logos or sounds); plays once when a delivery is confirmed and can be
tapped away; off under reduced motion; a switch in This phone / Account to
turn it off; never blocks the next tap; nothing on the TV board. Built
first as a stand-alone preview file so it can be judged before it goes in
the app. Recommended: A.

### 26.1 Direction from the user (2026-11-11)

Leaning to **B, low-poly 3D**. The van is charcoal grey. Both marks appear
in the scene: the Umbrella Automation wordmark on the van's side (two
lines sharing a left edge, never centered, per the brand guide), and the
Loadout hard-case mark on the box that gets dropped and on the closing
banner. Estimate with the marks: 280k to 450k Opus tokens, one revision
round adds 100k to 150k. In plan terms, measured on 2026-11-11 (about 1.1M
Opus tokens of builds plus Fable's own work used 59% of a 5-hour window and
8% of the week): roughly 15 to 25% of one 5-hour window and 2 to 3.5% of
the week. Still awaiting a go-ahead. Build as `delivery-preview.html`
first; in the app the 3D library loads only when the animation plays and
falls back to the banner alone when offline or on a slow phone.

### 26.2 The opening shot: the shop, from a high angle (user, 2026-11-11)

The user wants the scene to open on the company's own office from a high
angle, with the van leaving from it. Fable looked at the aerial view the
user linked and describes the place for the modeler below. The scene is
drawn from scratch as low-poly shapes; no map imagery, photo, address,
street name or coordinate goes into the file or the repo (it is public).

- **The building.** The south end unit of a long single-story strip of
  shops. Flat roofs with a low parapet: the strip's roof is off-white, the
  end unit's is a darker tan-brown, so it reads as "ours". A few roof units
  (small grey boxes). The front faces east: brick, a band of storefront
  glass, a door. The Umbrella Automation wordmark sits on a sign band over
  the door (two lines sharing a left edge).
- **The lot.** A paved lot along the whole front, one row of stalls nosed
  in to the building and a second row along the road, a grass strip with a
  curb between the lot and the road. A drive aisle runs along the south
  wall of the building to a second lot behind. A handful of parked cars as
  plain colored blocks.
- **The road.** A wide north-south road east of the lot: two lanes each
  way and a center turn lane, with a thick tree line on the far side. A
  smaller cross street to the south, past a separate small building with a
  white roof.
- **The shot.** Camera starts high to the south-east looking down at about
  40 degrees (the angle of the user's link), the charcoal van backs out of
  a stall by the door, pulls to the lot's exit and turns onto the road;
  the camera swings down behind it as it drives off, cut to the house, the
  box with the Loadout mark drops at the door, the banner lands.
- **Estimate with the office scene:** 330k to 550k Opus tokens, about 18
  to 30% of one 5-hour window and 2.5 to 4% of the week; a revision round
  adds 5 to 8% of a window. Length grows to about 5 seconds, still
  skippable with a tap.

### 26.3 Feedback on preview 0.1.1, and version 0.2.0 (user, 2026-11-11)

The user watched 0.1.1 and wants four changes.

1. **The box is carried, not thrown.** Two employees in charcoal grey
   polos and blue jeans take it out of the back of the van together, carry
   it up the walk, and set it down at the door.
2. **No green on the banner.**
3. **The word.** "Delivered" may not be right; the user floated "Product
   Reached Project" and is unsure. The preview gets a wording switch so it
   can be read in place: **Product on site** (Fable's pick: three short
   words, says where the product is), **Delivery complete**, and **Product
   reached project** (the user's). And a color switch: **Brand** (white
   lettering on a charcoal band with the company blue as the rule and the
   mark, matching the van and the polos) and **Gold** (warm gold lettering
   with a dark outline on a dark translucent band). The user picks; the
   app ships one.
4. **More 3D, in the direction of GTA V.** Honest scope: a browser scene
   built from code will not look like a AAA game with artist-made models;
   it can look like a polished 3D game rather than flat blocks. That means
   real cast shadows, lit materials with some texture (asphalt, grass,
   brick, roof), a rounder and more detailed van (arches, rims, mirrors,
   lights, glass that catches the sky), better scene dressing, a low
   cinematic chase camera with a little shake and letterbox bars, and the
   ending handled the way that game does it: the world slows, dims and
   loses color behind the banner as the words land hard.

People are stylized (rounded limbs, a simple head and hair, no drawn
faces), walk with a real cycle, and carry the box between them. They are
nobody in particular. The scene grows to about 8 seconds and stays
skippable. Phones get a lighter quality tier chosen by a quick speed test.
Estimate: 350k to 550k Opus tokens, about 14 to 22% of one 5-hour window
and 2 to 3% of the week, built after the window resets.

### 26.4 Free assets approved (user, 2026-11-11)

The user approved using free CC0 assets, downloaded only from the makers'
own sites: Kenney (kenney.nl), Quaternius (quaternius.com) and Poly Haven
(polyhaven.com). People, the van, cars, houses and street pieces come from
those packs; a real sky image lights the scene; ground and wall textures
come from Poly Haven. The shop building, the lot and road layout, the box
and the banner stay custom. Each license is read before use and recorded
in `delivery/credits.txt`. Shipped files live in `delivery/`, at most 2 MB
each and 6 MB in all, and load only when the animation plays. Not used:
Mixamo (unclear for a public repo) and any credit-required marketplace
asset. The preview works from the published address only, since a browser
blocks model files on a local file address.

## 27. A tooltip on every action (user, 2026-11-11; build as 0.11.1)

The user hovered over "Retire" on a product's panel and got nothing. The
house rule is a tooltip on every non-obvious control, saying what it does
and why, and the app has drifted from it: of about 390 buttons, about 290
carry neither a tooltip nor a label for assistive tech (many are Cancel and
Close, but Retire, Check in, Archive, Remove, Receive, Mark ordered and
others are in that count).

- **One source of truth.** A `TIPS` table keyed by action holds the
  sentence for each action: what it does, what happens next, and for
  anything that removes or ends something, what is lost and whether it can
  be undone ("Retire: takes this unit out of service for good. It leaves
  every list and count but keeps its history. It cannot be brought back
  from the app."). A button that already carries its own, more specific
  tooltip keeps it.
- **Coverage by construction.** Buttons get their tooltip from the table
  when they are drawn, so a new button with a known action cannot ship
  without one. `Loadout.tipAudit()` lists any visible button that has
  none, for checking.
- **Phones have no hover.** On a touch screen, an action row with more
  than one button ends with a small "What do these do?" link that opens a
  sheet listing each button in that row with its sentence. Confirm sheets
  already explain themselves and are left alone.
- Plain Cancel, Close, Back, Done and Next are not given tooltips; the X
  buttons keep their labels for assistive tech.

**Built in 0.11.1** (2026-11-11, not committed). Everything above, with these
choices: the What do these do? link always sits on its own line under the
row (never squeezed beside the buttons), so no row wraps differently at
360; "Got it" on the ? sheet counts as a plain close; the confirm sheets'
button takes the sheet's own sentence as its tooltip, so those sentences
are not repeated in `TIPS`; links styled as buttons (Pick up, Confirm
delivery, Open the job) are covered too, keyed by their address.

## 28. A way back from every door, and renaming locations (user, 2026-11-11; build in 0.11.1)

### 28.1 Back to Home

The user opened a door and could not get back. The door screens (Pull,
Pick up, Confirm a delivery, Receive, Audit) have a color band and a
heading but no way back except the tab bar, and inside the home-screen app
there is no browser Back button.

- Every screen reached from Home starts with a back link above its
  heading: a chevron and the word **Home**. One level in (a job's Pull,
  Pick up or Deliver screen, one shelf's audit) the crumb reads the parent
  first: "Pull for a job / Job 1042", each part a link, as those screens
  already do. Office sections keep "Office / Section" (or More for techs).
- The link is a real link, 44 px tall on the phone, first in the tab order
  after the skip link, and sits inside the band's card so it never scrolls
  sideways. Escape does not navigate; it is not a form.

### 28.2 Locations: add, rename, archive

The user asked whether Settings lets an admin add or rename shelf
locations. Today: New location is on Shelf, Locations (admin and
warehouse); a location's panel edits only its kind; the name cannot be
changed at all, and Settings has no entry for locations.

- **Rename (admin only)** on the location's panel: area and shelf fields,
  with the name they make shown as it will print. The location keeps its
  id, so its printed QR label still scans; the readable name stored beside
  that id is rewritten on stock rows, units, wire boxes, products that use
  it as their default, and open job lines, in batches of at most 400, with
  one edit movement ("Location renamed: Storage room, Shelf B to Storage
  room, B3, 14 records"). Past movements keep the old name; they are
  history. After a rename the panel offers **Print a new label**. A name
  that matches another location (case and spacing ignored) is refused with
  "Another location already has that name."
- **Archive (admin only)**: only when nothing is stored there (no stock, no
  units, no boxes); it leaves pick lists and the audit list and stays in
  history. Unarchive from a "Show archived" toggle.
- **Kind** stays editable by admin and warehouse as now, with a tooltip on
  what each kind changes (a bay can hold a job's staged product; a vehicle
  or van counts as "in a van").
- **Settings** gains a "Locations" line: "Shelves, bays and vehicles are
  managed on Shelf, Locations" with a link, so a person who looks there
  finds it.

**Built in 0.11.1** (2026-11-11, not committed, no rules change: the
`loadout_*` wildcard already lets admin write locations, `archived`
included, and admin writes every field the rename touches). Notes: the Home
link is the first control inside the page content; the header (the mark,
the views, the account block) still comes before it in the tab order.
"Open job lines" is read as the staging bay name on open jobs and open job
names (`stagingLocationName`); job lines carry no location name of their
own besides `pickedFromName`, which is history and keeps the old name.
Archive also refuses a location that is an open job's staging bay. The
Kind tooltips follow the code: a vehicle can be pulled from like a shelf,
a van cannot, and neither counts a line as "in a van" (that is the line's
picked-up quantity). New location now also refuses a name another location
has, and a name whose label code belongs to a renamed location says so.

## 29. Loadout in pictures: a comic, a flow chart, and a refreshed storyboard (user, 2026-11-12; build as 0.12.0)

**Built in 0.12.0** (2026-11-12, not committed). The speech is HTML over the
drawn bubble, sized in container units so it wraps the same at every width.
The flow chart is one SVG with two layouts; below 900 px a script moves its
boxes into three columns so no word drops under 12 px. Office steps (1, 4,
8) have no door, so their band is the pale nav-on blue.

The user asked for the storyboard and the flow chart to be improved and for
a nine-panel comic strip that makes the process plain. The storyboard has
been patched release after release; its captions are current but most of
its 19 sketches were drawn before 0.8.0 and no longer look like the app.

### 29.1 A new first tab: "In pictures"

Two things, each printable on one page, for a person who will not read the
rest.

**The comic, nine panels, three by three** (one column on a phone). Flat
drawn figures in charcoal polos and jeans, nobody in particular, named only
by role. Each panel has a number, a short title on a band in that step's
door color, one speech line, and one caption under it. Words are final:

| # | Title | Who and what | Says | Caption |
| --- | --- | --- | --- | --- |
| 1 | A client says yes | Office, at a desk, the screen reads New job | "Client said yes. I will make the job." | A job is the list of product one install needs. |
| 2 | The warehouse sees it | Warehouse, phone in hand, the Pull door reads 1 job to pull; the TV on the wall shows the job | "One to pull." | Home shows what is waiting behind each door. |
| 3 | Pull | Warehouse at a shelf, box in hand, the phone button reads Pull 4 | "Four from Shelf B." | Shelf to the job's bay. Tap Pull and the count drops. |
| 4 | Something is short | A pull sheet line marked Short 2; Office at the screen | "Two short. Ordering them." | Loadout says what the shelf cannot cover. |
| 5 | The box arrives | Warehouse at the dock door with a carrier's box, the phone reads Receive | "It is here. Into Bay 2." | Receive a shipment puts it with the job. |
| 6 | Pick up | Tech loading the charcoal van from the bay | "Loading Bay 2. It is on me now." | Bay to the van. From here it is in the tech's name. |
| 7 | Deliver | Tech at the client's door with the box, the phone reads Confirm delivery | "Product on site." | Van to the client. Tap to confirm what arrived. |
| 8 | Close the job | Office; a leftover box going back on the shelf | "Job is done. Leftovers go back." | Closing returns what was not used. |
| 9 | Keep it honest | Warehouse counting a shelf, phone in hand | "Shelf says 12. I count 12." | Auditing one shelf at a time keeps every number true. |

**The flow chart**, redrawn for print: three lanes (Office, Warehouse,
Tech) with the steps in order, the two side paths (Order what is short,
then Receive a shipment; Bring back), Audit as its own loop, and the TV
board noted on Pull. Under it one strip, "Where the product is": Shelf,
Bay, Van, Client, with the step that moves it written between each pair.
That strip is the whole app in one line.

### 29.2 The storyboard itself

- Every sketch is checked against the live demo screen it claims to show
  and redrawn where it no longer matches (Home with the doors and counts,
  Pull, Pick up, Confirm a delivery, Receive, Audit, Shelf with filters,
  the timeline, New job's two choices, the photo sheet, the Job report,
  Office, the header account block, the TV board grid and its phone
  layout). Same drawing style throughout.
- "A day in the warehouse" follows the comic's order, so the comic is its
  table of contents: each comic panel links to its storyboard panel, and
  each storyboard panel to its SOP.
- Overview opens with the flow chart small, then three sentences, then the
  rest; nothing the comic already says is repeated at length.
- A one-page "Your job in Loadout" sheet per role (warehouse, tech,
  office, accounting): the doors that role uses, in order, one line each.

### 29.3 In the app

Office (More for techs), About gains "How Loadout works", opening the
In pictures tab, so every role can find it from the phone.

## 30. A training deck with real screenshots (user, 2026-11-12; build after 0.12.0)

The user asked for a PowerPoint with actual screenshots of the flow so
employees understand how Loadout will work.

- **File:** `training/Loadout-how-it-works.pptx`, 16:9, plus the
  screenshots it uses in `training/shots/`. Built with the pptx skill.
- **Screenshots are real screens of the app in demo mode** (invented
  clients and products, never the shop's data), captured by script at phone
  size so they can be retaken after any release. The TV board and the Job
  report are captured at desktop size.
- **One idea per slide:** a phone screenshot on one side, a title that
  names the step, and at most three short lines: what you do, what Loadout
  does, what to watch for. The talk track goes in the speaker notes, so the
  slides stay sparse and whoever presents has the words.
- **Order (about 18 slides):** title; the whole thing in one line (Shelf,
  Bay, Van, Client) with the flow chart; the comic; who does what; Home and
  its doors; a job starts (New job); Pull for a job; when something is
  short; Receive a shipment; the TV board; Pick up from staging; Out with
  me; Confirm a delivery; Bring back; Close job; Audit a shelf; Shelf and
  Scan (find anything); getting it on your phone and where to get help.
- **Look:** the company's charcoal and blue with the app's door color as
  the accent on each step's slide, so a slide's color matches the door the
  person will tap. System fonts only, so it opens the same on any PC.
- The app's About row "How Loadout works" gains a second link to the deck
  once it exists.

## 31. Start a job from Portal's pick list PDF (user idea, 2026-11-12; NOT scheduled, needs samples)

The user: whoever learns a proposal was approved should be able to upload
the pick list as a PDF from Portal, as an option, and the comic and the
workflow should show that.

- **Where it goes.** Not a third choice. The "Use a proposal file" card in
  New job takes either file: "The proposal or pick list from Portal (.csv
  or .pdf)". A PDF goes through the same "Here is what the file says"
  check as a CSV, so a misread line is caught before the job exists.
- **How a PDF is read.** In the browser, with a PDF text reader loaded only
  when a PDF is chosen (the same pattern as the barcode fallback). Portal's
  PDFs are generated, not scanned, so the text is there; the work is
  turning positioned text back into rows (room, brand, model, description,
  quantity) and telling product lines from labor, fees and totals. That
  mapping can only be written against real files.
- **Needed before any build:** two or three real pick list PDFs from
  Portal (a small job, a large one, one with wire by the foot and one with
  a change order if possible), saved in `samples/` (git-ignored; never
  committed or quoted), and the matching CSV for at least one of them so
  the two readings can be compared line for line. If a PDF turns out to be
  a scan with no text in it, this cannot work and the CSV stays the way.
- **Who uploads.** Today only admin and warehouse can make a job. If the
  person who hears "approved" is a tech or a salesperson, either they get
  a narrow right to upload a proposal, which creates a job marked To
  review for the office to confirm (the Zapier intake already uses that
  flag), or the upload stays with the office. Open: D21.
- **What changes in the pictures.** Comic panel 1 becomes the upload: the
  person at the screen drops the pick list in ("Client said yes. Uploading
  the pick list." / "The pick list from Portal becomes the job."). The flow
  chart's first box reads "New job: upload the pick list, or make the
  list". SOP-3, the role sheets, and deck slides 3 and 8 follow.
- **Open decisions:** D21 who may upload; D22 whether a PDF upload should
  also keep the PDF itself on the job (in Storage) so the office can open
  the original.
- **D21 decided (user, 2026-11-12): the office.** The office hears first
  and uploads, so no new upload right for techs or sales; New job stays
  with admin and warehouse as today. Comic panel 1 keeps the Office figure.
  D22 (keep the PDF on the job) is still open. Build waits on the sample
  PDFs in `samples/`.
- **Built in 0.12.1:** the pictures and wording show the office uploading
  the proposal file (.csv today); the PDF reader still waits on samples.

## 32. Words and steps that match the shop (user, 2026-11-13; build as 0.13.0 after 0.12.2)

Three corrections from the user after reading the comic.

### 32.1 No "bay"

The shop has shelves, a storage room, a tech area, and the warehouse in
general. It has no bays, and "Bay 2" was an assumption from the first plan
(D4). Decisions:

- The generic word for where pulled product waits is **staging area**. The
  location kind's label reads "Staging area" (the stored kind value stays
  `bay`; the rules key on it and nothing in the data changes).
- Every readable string loses "bay": doors ("staging area to your van"),
  progress lines, the job page ("Staging: Tech area"), sheets, tooltips,
  reports, the TV board, print, the data dictionary's descriptions.
- The four places become **Shelf, Staging area, Van, Client**; where a real
  location is shown, its own name is used (assumed: the **Tech area**).
- Demo data: Bay 1, 2, 3 become Tech area spots ("Tech area, Job shelf 1"
  and so on), so the demo, the screenshots and the deck stop teaching the
  wrong word.
- Real data: locations named Bay 1 to 4, if the first setup created them,
  are renamed by an admin with the Rename button from 0.11.1; the release
  note says so and Office, Settings shows a one-line prompt while any
  location name still contains "Bay".
- OPEN (D23): is the tech area where pulled product waits for the tech,
  and is it one shared area or a marked spot per job?

### 32.2 Closing a job scans the leftovers back

The user: closing must record what was not used and scan it back into
inventory. Today Close job asks "Back to stock" or "Write off" and a
location from a list; nothing is scanned.

- Close job's leftover step (and Bring back) gains the scan field the Pull
  sheet already has: scan the **shelf label** to set where it goes back,
  and scan each **unit's or wire box's QR** to tick it as returned. A
  counted product with no QR is confirmed by a number, as now. Scanning is
  the default path on a phone; picking from the list stays as the fallback.
- The done box lists what went back and where, and the job's timeline
  records each as a move, as now.
- Comic panel 8: "Job is done. Scanning the leftovers back." / "What was
  not used is scanned back onto its shelf, so the count stays right."

### 32.3 Short means approve, then order

The user: a short line still has to be approved and then ordered. Today a
short line goes onto a draft PO and the office presses Mark ordered; no one
approves.

- A draft PO is called an **order request**. It gains **Approve** (admin
  only; `approvedAt`, `approvedBy`, `approvedByName`) and cannot be marked
  ordered until approved. Warehouse can raise and edit a request and sees
  "Waiting for approval". A request can be sent back with a note.
- Home's Pull door wording and the Pull screen's "Waiting on orders" group
  show the three states: Not requested yet, Waiting for approval, On order.
- Comic panel 4: title "Something is short"; "Two short. Asking to order
  them." / "A short line becomes an order request. The office approves it,
  then orders."
- Flow chart: the side path reads Order request, Approve, Order, Receive.

All three change the comic, the flow chart, the storyboard, the role sheets
and the training deck in the same release.
