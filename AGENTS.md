# Plan Revision v2

## Product Direction

Positioning:

Premium Prompt Generator for Microstock Creators

Goals:

* Generate high-quality stock-image prompts
* Reduce repetitive prompt generation
* Maximize prompt variation
* Fast workflow with modern UX
* Suitable for beginners and power users

---

# Updated MVP Features

## Generator

### Aspect Ratio

Default:

* Random

Options:

* 1:1
* 4:5
* 3:4
* 16:9
* 9:16
* 2:3
* 3:2

Commercial-focused presets.

---

### Idea / Niche

Features:

* Manual input
* Random niche generation
* Improve niche
* Niche history reference

---

### Style Presets

Options:

* None
* Random
* Custom

Built-in Presets:

* Commercial Photography
* Lifestyle
* Corporate
* Medical
* Food
* Travel
* Education
* Technology
* Business
* Nature
* Real Estate

Future:

* User-defined presets

---

### Prompt Generation

Features:

* Generate Prompt
* Improve Prompt
* Copy Prompt
* Regenerate Prompt
* Batch Prompt Generation

Variation Controls:

Generate:

* 1 Prompt
* 3 Prompts
* 5 Prompts
* 10 Prompts

Each generated prompt should be significantly different.

---

### Prompt Quality Rating

Display AI-generated quality score.

Evaluation categories:

* Commercial Potential
* Creativity
* Clarity
* Marketability
* Uniqueness

Example:

Overall Score:
8.8 / 10

---

# Prompt Template System

Default template included.

Features:

* View template
* Edit template
* Reset template
* Import template
* Export template

User templates stored locally.

---

# History / Prompt Log

Storage:

* Local cache only (MVP)

Operations:

* Save prompt
* Delete single prompt
* Delete all prompts
* Search prompts
* Filter prompts

Filters:

* Aspect Ratio
* Style Preset
* Rating
* Date

Import:

* TXT

Export:

* TXT

---

# Duplicate Detection System

Status:
Mandatory MVP Feature

Purpose:
Prevent repetitive prompt generation.

Requirements:

Before generating:

* Analyze prompt history
* Detect similarity
* Reduce duplicate concepts

Rules:

High Similarity:

* Reject generation
* Generate alternative variation

Medium Similarity:

* Warn user
* Increase variation level

Low Similarity:

* Accept

Future:

* User-adjustable similarity threshold

---

# Settings

## AI Configuration

Fields:

* API Key
* Endpoint
* Model

Features:

* Save preset
* Load preset
* Delete preset
* Export preset
* Import preset

Format:
JSON

---

## Theme

Options:

* Light
* Dark
* System

Persist locally.

---

## Language

Options:

* Bahasa Indonesia
* English

Persist locally.

---

# Persistence Strategy

Store locally:

* Prompt History
* API Presets
* Custom Templates
* Theme
* Language
* User Preferences

Recommended Storage:
IndexedDB

Reason:

* Better for large history
* Better scalability
* Better export/import support

---

# UI / UX Direction

Architecture:
Single Page Application

Sections:

* Generator
* History
* Templates
* Settings

Design Goals:

* Modern
* Premium
* Fast
* Smooth animations
* Mobile-friendly
* Desktop-first productivity

Visual Style:

* Premium dark mode
* Glassmorphism (light usage)
* Smooth transitions
* Strong visual hierarchy

---

# Technical Architecture

Framework:
React

Build Tool:
Vite

Deployment:
Vercel

License:
MIT

Internationalization:
i18next

State Management:
TBD

Storage:
IndexedDB

---

# React Structure

src/

app/

* providers/
* store/

features/

* generator/
* history/
* settings/
* templates/
* localization/

components/

* ui/
* common/
* layout/

services/

* ai/
* storage/
* export/
* similarity/

hooks/

lib/

i18n/

assets/

This project must follow modular architecture.
Avoid large monolithic components.
Reusable logic should be extracted into hooks, services, or shared utilities.

---

# Roadmap After MVP

## Version 1.1

* Negative Prompt Generator
* Prompt Favorites
* User Style Presets
* Advanced Similarity Settings

## Version 2

* Commercial Safety Check
* Title Generator
* Description Generator
* Keyword Generator
* Multi-provider AI Support
* Cloud Sync
* Google Sheets Integration
