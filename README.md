# FitMatcher 👕
[![License: All Rights Reserved](https://img.shields.io/badge/License-All_Rights_Reserved-red.svg)](#license--copyright)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![Vanilla JS](https://img.shields.io/badge/Stack-Vanilla_JS-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

> A lightweight browser extension that stores your personal clothing measurements, color-codes online size charts, and generates auto-sized search queries across secondhand marketplaces.

---

## The Problem
Online size charts are inconsistent, secondhand marketplaces require typing repetitive measurement filters (`32x30`, `44 chest`), and saving garments across different websites leads to cluttered bookmarks. 

**FitMatcher** acts as your personal sizing assistant by grading fit accuracy directly on product pages and launching sized marketplace searches with a single click.

---

## ✨ Features

| Feature | Description |
| :--- | :--- |
| **🟢 Smart Fit Badge** | Scans product pages and injects an on-screen badge highlighting **Exact (Green)**, **Relaxed (Yellow)**, or **Borderline (Orange)** fits. |
| **🔄 Auto-Unit Conversion** | Automatically detects centimeter size guides on international storefronts and converts them to inches on the fly. |
| **📌 FitList Wishlist** | Save matching garments with custom notes (*e.g., "Seller accepted $25 offer"*) and export your backups as a `CSV` or `JSON` spreadsheet. |
| **🛍️ Smart Marketplace Search** | One-click search buttons that auto-append your measurements to queries on **eBay**, **Google Shopping**, **Poshmark**, and **Grailed**. |

---

## 🚀 Quick Start (Developer Mode)

### Chrome / Edge
1. Download or clone this repository to your local machine:
   ```bash
git clone https://github.com/SnowedCountry/fit-matcher.git
