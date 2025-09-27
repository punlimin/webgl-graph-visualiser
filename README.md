# WebGL Canvas Renderer Demo

This project demonstrates a **WebGL2 point renderer** in a React (Next.js) app.  

It streams points from a worker and supports **pan/zoom navigation** with an **auto level-of-detail (LOD)** system.



## Features

- **Interactive Canvas**
  - Pan with **drag**
  - Zoom with **mouse wheel**
- **Level of Detail (LOD)**
  - Switches between **coarse** and **full** datasets automatically
  - Auto-LOD for fast overview when zoomed out
- **WebGL2 Renderer**
  - Uses VAOs and buffers for efficient rendering
- **Responsive UI**
  - Canvas auto-fits to window/container size
  - High DPI (`devicePixelRatio`) support



## Getting Started

### 1. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Run the dev server
```bash
npm run dev
```

App will be available at [http://localhost:3000](http://localhost:3000).


## Controls

- **Pan:** Click + drag  
- **Zoom:** Scroll wheel  
- **LOD:** Switch between *full*, *coarse*, or *auto* (based on zoom)  
