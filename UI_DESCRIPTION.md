# TipTap Application – UI Description

This document describes the **user interface (UI)** of the TipTap application.  
It is intended for use with **Cursor AI**, alongside the API documentation.  

---

## Onboarding & Authentication
- **Welcome Screens**
  - Branded with *TipTap* logo and slogans (*“Swipe your way to the perfect job”*).
- **Sign Up Flow**
  - Options: *I’m an employer* / *I’m an employee*.
  - Fields: Full name, email, password, status (Pre-army, Post-army, Student, Other).
  - Buttons: *Remember me*, *Create Account*.
- **Sign In Flow**
  - Inputs: Email, password.
  - Actions: *Forgot password?*, *Sign in*, *Sign up* link.

---

## Employer Side (Business UI)

### Business Profile Setup
- Fields:
  - Business Name, Address, Current Location.
  - Business Type: Restaurant, Café/Bar, Hotel.
  - Hiring Roles: Waiter, Barmen, Barista, Hostess, Sommelier, Shift Manager.
  - Job Timing Needs: This week, Next 2 weeks, Always looking.
  - Shifts: Morning, Evening, Weekends, Full-time, Part-time.
  - Experience: No experience, Some experience, Experienced only.
- Upload: Business logo/photo.

### Employer Dashboard
- **Active Jobs**
  - Example: *Waiter – Full Time, 12 Applicants*.
  - Example: *Hostess – Part Time, 5 Applicants*.
  - Actions: *View, Edit, Pause*.
- **Daily Summary Panel**
  - Active jobs count.
  - New applicants count.
  - Upcoming interviews.
  - Unread chats.

### Chat & Interview Flow
- Employer–candidate messaging.
- Quick actions: *Confirm Interview* with time slots.
- Integration: *Add to Calendar*, *Get Directions*.
- Automated assistant with option to switch to a real person.

### Business Profile Page
- Details: Address, description (“About”).
- Account management: Change password, pause/delete account, notifications.

---

## Employee Side (Job Seeker UI)

### Profile Setup
- Personal Info: Name, Age, Status (Student, Pre/Post Army, Other).
- Job Preferences: Roles (Waiter, Bartender, Barista, etc.), Availability (Morning, Evening, Weekends, Full/Part Time).
- Upload photo (increases hiring chance).
- Action: *Go Live & Start Swiping*.

### Job Browsing / Matching
- Swipe-style interface.
- Each card shows:
  - Job title, Business name, Location.
  - Pay rate (₪), Required experience, Languages.
  - Shifts and working hours.
- Match percentage displayed (e.g., *60% matching*).

### Candidate Profile View
- Reviews and ratings.
- Jobs completed, active matches, interviews.
- Personal bio and availability.

### Notifications
- Upcoming interviews.
- New matches.
- Messages.
- Status updates (e.g., *Interview succeeded, arriving for shift*).

---

## Core Navigation
Persistent navigation includes:
- **Home** → Dashboard or feed.
- **Jobs** → Listings (employer: posted jobs, employee: available jobs).
- **Notifications** → Matches, interviews, updates.
- **Chat** → Messaging with employers/candidates.
- **Profile** → Business profile or candidate profile.

---

## Summary
TipTap is a **swipe-based hiring and matching platform** for the hospitality sector.  
It provides:
- **Employers** → Quick job posting, applicant tracking, and interview scheduling.  
- **Employees** → Simple profile setup, swipe-based job discovery, and real-time chat.  
- Both sides interact through **chat, interview scheduling, and notifications**.
