# 🏥 Vaccination Centers — Health Worker Portal

Part of the [Vaccination Management System](https://github.com/IstiakAdil14/automating-the-vaccination-process-hackathon-project-centers).

Runs on **port 3002** locally. Used by vaccination center staff to manage slots, record vaccinations, handle walk-ins, and monitor inventory.

---

## 🚀 Getting Started

```bash
cp .env.example .env.local   # fill in your values
npm install
npm run dev                  # http://localhost:3002
```

---

## ✨ Features

- Center registration & profile management
- Daily slot/capacity configuration
- Walk-in patient handling
- Vaccination record entry
- Inventory & stock monitoring
- Queue/token management system
- Offline operation + background sync
- Fraud/duplicate detection alerts
- Staff shift scheduling & performance tracking

---

## 🔑 Environment Variables

```env
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3002
MONGODB_URI=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Create a `.env.example` with these keys (no values) and add `.env.local` to `.gitignore`.

---

## 📶 Offline Support

Uses **Service Workers + IndexedDB** for offline-first operation. Data syncs automatically when connectivity is restored.

---

## 🚀 Deployment

Deploy to Vercel as a standalone project. Set all env vars in the Vercel dashboard.

---

## 📄 License

MIT
