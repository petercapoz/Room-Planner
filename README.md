# RoomCraft Planner

RoomCraft Planner is a runnable local prototype for a room planning and furniture layout application. It is designed for homeowners who want a simple planning canvas and for designers or movers who need exact dimensions, labels, floor-space checks, and exportable plans.

## Run Locally

Open `index.html` in a browser. No build step or package install is required.

The app saves layouts in browser `localStorage`, so projects remain available when you reopen the same browser on the same machine.

## Implemented Prototype Features

- Create, duplicate, edit, and save multiple room layouts.
- Enter exact room length, width, height, and unit.
- Apply bedroom, living room, office, studio, and apartment room templates.
- Add furniture from a common-item library or create custom furniture.
- Label every furniture item.
- Drag furniture inside room boundaries.
- Resize furniture with the lower-right handle.
- Rotate furniture in 90-degree increments.
- Duplicate and delete furniture items.
- Display room wall measurements and furniture dimensions.
- Show remaining free floor space and occupied percentage.
- Detect furniture collisions.
- Show wall-distance measurements for the selected item.
- Measure clearance between two furniture items.
- Toggle between a 2D floor-plan view and a lightweight 3D visualization.
- Export a PNG image and open a print flow that can save to PDF.
- Generate a simple automatic layout suggestion.

## Recommended Technology Stack

### MVP

- Frontend: React, TypeScript, Vite, Tailwind CSS or CSS Modules.
- 2D planning: Canvas with Konva.js or Fabric.js for precise drag, resize, rotate, snapping, measurement overlays, and export.
- 3D visualization: Three.js with React Three Fiber.
- Persistence: PostgreSQL with Prisma.
- API: Node.js with NestJS or Fastify.
- Auth: Clerk, Auth0, or Supabase Auth.
- File export: server-side PDF generation with Playwright or Puppeteer.
- Hosting: Vercel for frontend, Fly.io or Render for API, managed Postgres.

### Advanced

- AR: WebXR for capable Android browsers; iOS Quick Look / RealityKit bridge for iPhone; native companion app with ARKit/ARCore if high reliability is required.
- AI layout suggestions: OpenAI API using room constraints, required furniture, clearances, and intended room use; deterministic collision solver validates the model output.
- Collaboration: WebSockets or Liveblocks for shared editing.
- Assets: GLB/USDZ model pipeline for furniture visualization.

## System Architecture

```text
Browser App
  |-- Room editor
  |-- Furniture library
  |-- 2D planner engine
  |-- 3D viewer
  |-- Export tools
  |-- AR preview launcher
        |
        v
API Service
  |-- Auth and user profiles
  |-- Project CRUD
  |-- Layout validation
  |-- AI suggestion orchestration
  |-- Export rendering jobs
        |
        v
PostgreSQL + Object Storage
  |-- Users
  |-- Projects
  |-- Rooms
  |-- Furniture items
  |-- Furniture templates
  |-- Export files
  |-- 3D assets
```

The frontend should own interactive editing latency. The backend should validate saved layouts, store versions, generate exports, and coordinate heavier AI or rendering jobs.

## Database Design

```sql
users (
  id uuid primary key,
  email text unique not null,
  name text,
  created_at timestamptz not null
);

projects (
  id uuid primary key,
  user_id uuid references users(id),
  name text not null,
  unit text not null default 'ft',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

rooms (
  id uuid primary key,
  project_id uuid references projects(id),
  name text not null,
  length numeric not null,
  width numeric not null,
  height numeric,
  wall_json jsonb not null default '{}'
);

furniture_templates (
  id uuid primary key,
  name text not null,
  category text not null,
  length numeric not null,
  width numeric not null,
  height numeric,
  model_url text,
  metadata jsonb not null default '{}'
);

furniture_items (
  id uuid primary key,
  room_id uuid references rooms(id),
  template_id uuid references furniture_templates(id),
  name text not null,
  length numeric not null,
  width numeric not null,
  height numeric,
  x numeric not null,
  y numeric not null,
  rotation numeric not null default 0,
  color text,
  locked boolean not null default false,
  metadata jsonb not null default '{}'
);

layout_versions (
  id uuid primary key,
  project_id uuid references projects(id),
  snapshot jsonb not null,
  created_by uuid references users(id),
  created_at timestamptz not null
);

exports (
  id uuid primary key,
  project_id uuid references projects(id),
  type text not null,
  file_url text not null,
  created_at timestamptz not null
);
```

## AI Layout Suggestion Design

1. User selects room purpose, preferred style, must-have furniture, and clearance priorities.
2. Client sends normalized room dimensions, wall constraints, furniture dimensions, and existing placements.
3. AI proposes candidate placements with reasoning.
4. A deterministic layout engine checks boundaries, collisions, door swings, required walking clearance, and wall spacing.
5. Invalid placements are repaired by a solver or returned to the AI for another candidate.
6. User receives two or three selectable layout alternatives.

## AR Mode Design

For a production AR mode, separate "layout planning" from "real-room visualization."

- Use WebXR hit testing where supported.
- For iOS, export selected furniture as USDZ or launch an AR Quick Look-compatible preview.
- Store real-world anchors separately from 2D layout coordinates.
- Let users scale-check one item at a time before attempting a full-room overlay.
- Require calibrated units and clear user confirmation before saving measurements back into a project.

## Development Roadmap

### Phase 1: Planning MVP

- Build authenticated project dashboard.
- Implement room creation and exact dimensions.
- Add 2D canvas editor with drag, resize, rotate, snapping, labels, and collision checks.
- Add furniture templates and custom pieces.
- Persist projects to Postgres.
- Export PNG and PDF.

### Phase 2: Professional Tools

- Add wall segments, doors, windows, outlets, and obstructions.
- Add dimension lines and distance-measurement tools.
- Add multi-room apartment projects.
- Add version history and undo/redo.
- Add print-ready plan sheets with scale legends.

### Phase 3: 3D and Catalog

- Add Three.js viewer with furniture height and material previews.
- Add GLB/USDZ furniture assets.
- Add manufacturer catalog imports.
- Add lighting and camera presets.

### Phase 4: AI and Optimization

- Add room-intent questionnaire.
- Generate multiple layout suggestions.
- Validate suggestions with deterministic geometry constraints.
- Add spacing recommendations for walkways, doors, beds, dining chairs, and desks.

### Phase 5: AR and Mobile

- Build mobile-first measurement flow.
- Add AR placement for selected furniture.
- Add saved real-room anchors.
- Add native iOS/Android wrappers if WebXR coverage is not sufficient.

## Production Notes

- Use a geometry library for robust collision detection, snapping, and polygonal rooms.
- Store dimensions in a canonical unit internally, then convert for display.
- Treat AI output as a suggestion only; validate it with deterministic code.
- Use layout versioning so professional users can compare alternatives.
- Keep exports server-rendered for consistent PDFs across browsers.
