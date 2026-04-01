# Mentor Attendance Tracker

Minimal, mobile-first web app for tracking tutoring sessions, attendance, and optional income — fully offline using localStorage.

---

## 🚀 What’s Built

### 📅 Calendar
- Month grid view  
- Status indicators:  
  - 🟢 Completed  
  - 🔴 Missed  
  - ⚪ Pending / Free  
- Tap any day → filters slot list  
- Previous / Next month navigation  

---

### 🧾 Slot Cards
- Time (DM Mono style)  
- Student name (Syne style)  
- Tag/section pill  
- Optional income display  
- Left border color indicates status  

---

### 🔄 Status Cycle
- Tap status badge:  
  `Pending → Done → Missed → Pending`

---

### 🆓 Free Slots
- No student name:
  - Dashed border  
  - Italic “Free Slot” label  

---

### ✏️ Edit Modal (Bottom Sheet)
- Add / edit slot  
- Fields:
  - Date (flatpickr)  
  - Start / End time  
  - Student name  
  - Tag (datalist autocomplete)  
  - Income (optional)  

---

### 🗑️ Delete (Safe UX)
- No browser `confirm()`  
- Double-tap pattern:
  - First tap → “Tap again to confirm”  
  - Second tap → deletes  

---

### 📂 Sidebar (Slide-in)
- Tag/section list  
- Live count per tag  
- Global stats:
  - Total sessions  
  - Completed  
  - Missed  

---

### 🔍 Search
- Real-time filtering  
- Search by:
  - Student name  
  - Tag/section  
- Overrides date filter  

---

### 💰 Income Bar
- Totals:
  - Today  
  - This month  
  - All-time  
- Counts only **completed sessions**  
- Blur toggle (privacy mode)  
- State persisted in localStorage  

---

### 🌙 Dark Mode
- Full CSS variable theming  
- Toggle with sun/moon icon  
- Preference saved in localStorage  

---

### 💾 Local Storage
- Auto-saves on every action  
- Loads instantly on app start  
- No backend required  

---

### ⌨️ Keyboard Shortcuts
- `Esc` → Close modal / sidebar  
- `Enter` → Save form  

---

## 🧱 Tech Stack

- HTML  
- CSS (CSS variables for theming)  
- Vanilla JavaScript  
- Libraries (CDN):
  - flatpickr (date picker)  
  - dayjs (date handling)  

---

## 📦 Project Structure
