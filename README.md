# carti-retail-shopping

Retail shopping take-home: NestJS BFF + React Native (Expo) mobile client in one repo.

See [`SOLUTION.md`](./SOLUTION.md) for design, API surface, catalogues, and assumptions.

## Prerequisites

- Node 20+ (required by NestJS 11)
- npm 10+
- For mobile: Expo Go on a phone, or an iOS Simulator / Android Emulator

## Install

From the repo root:

```bash
npm install --workspaces --include-workspace-root
```

## Run the BFF

```bash
cd bff
npm run start:dev    # http://localhost:3000, prefix /api
```

## Run the mobile app

```bash
cd mobile
npm start            # opens Expo
```

On a physical device, point the app at your laptop's LAN IP:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-IP>:3000/api npm start
```

## Run the tests

From the repo root:

```bash
npm test             # runs both workspaces
```

Or per workspace: `npm run test:bff`, `npm run test:mobile`.
