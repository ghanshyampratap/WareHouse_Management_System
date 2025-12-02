# 📦Low Budget Automated Dispatch System Using RFID & ESP8266

## 🧩 Project Overview
This repository contains the design and development of a **low-cost Automated Dispatch System** for warehouse applications.  
The system automates inventory dispatch logging using **RFID (Radio-Frequency Identification)** technology integrated with an **ESP8266 microcontroller** — achieving real-time item tracking without manual intervention, under a total cost of **₹2,000**.


## 🎯 Objectives
- Automatically log items passing through a checkpoint.  
- Maintain unique identification for each item.  
- Operate within a **₹2,000** total budget.  
- Achieve **≥95% read accuracy** under realistic warehouse conditions.

### 🏗️ Working Principle
An **RFID Gate** detects each item’s **UID** when crossing a defined boundary.  
The **ESP8266** processes the event, attaches a timestamp, and uploads data to the cloud database.


#### Logical Flow:
<img width="1024" height="1536" alt="Automated Dispatch System Flowchart" src="https://github.com/user-attachments/assets/b259b06f-db51-4f33-88b8-600789dd811b" />



## 🧠 Components

| Layer | Component | Function |
|--------|------------|-----------|
| **Identity** | MIFARE Classic 1K Passive Tags | Store UID for each item |
| **Detection** | RC522 RFID Reader (13.56 MHz) | Detects tags at checkpoint |
| **Processing** | ESP8266 NodeMCU | Handles logic, Wi-Fi, and cloud updates |



## 💰 Economic and Functional Requirements

### Economic
- Total cost ≤ **₹2,000**
- Tags cost < **₹20** each for scalability
- No recurring maintenance (passive tags only)

### Functional
- **Unique Identification** — 4-byte UID for each item  
- **Non-Line-of-Sight (NLoS)** detection through magnetic induction  
- **Passive tag operation** (no batteries)  
- **Wi-Fi connectivity** for live database updates  
- **Short detection zone** to prevent false triggers
  
## 🪛 **Pin Connections (ESP8266 ↔ RC522)**

| RC522 Pin | ESP8266 NodeMCU Pin | Description |
|------------|---------------------|--------------|
| **SDA (SS)** | **D2 (GPIO4)** | Chip Select |
| **SCK** | **D5 (GPIO14)** | Clock Signal |
| **MOSI** | **D7 (GPIO13)** | Master Out Slave In |
| **MISO** | **D6 (GPIO12)** | Master In Slave Out |
| **IRQ** | **Not Connected (NC)** | Interrupt (optional) |
| **GND** | **GND** | Ground |
| **RST** | **D1 (GPIO5)** | Reset |
| **3.3V** | **3V3** | Power Supply |

⚠️ **Note:**  
- RC522 operates on **3.3V logic** — never use 5V directly.  
- Ensure **common ground** between RFID reader and NodeMCU.  

## 📸 Images
<img width="1920" height="1020" alt="Screenshot 2025-12-02 214411" src="https://github.com/user-attachments/assets/82ac9985-c9da-4f81-97e3-010be30ed7fa" />

<img width="1920" height="1020" alt="Screenshot 2025-12-02 214417" src="https://github.com/user-attachments/assets/ea83e6a1-e27d-4e49-bb97-52dfd6e97537" />

<img width="1920" height="990" alt="Screenshot 2025-12-02 015507" src="https://github.com/user-attachments/assets/71c8eb3b-d5fb-44df-a0f6-0e9818a3149b" />


## 🧾 Bill of Materials (BOM)

| Component | Qty | Unit Price (₹) | Line Total (₹) |
|------------|-----|----------------|----------------|
| ESP8266 NodeMCU | 2 | 350 | 700 |
| RC522 RFID Module | 2 | 120 | 240 |
| MIFARE Classic 1K Tags | 2 | 75 | 150 |
| Jumper Wires + USB Cable | 1 | 100 | 100 |
| **Total** | — | — | **₹1,190** |


## 🚫 Rejected Alternatives

| Technology | Reason for Rejection |
|-------------|----------------------|
| **QR / Barcode** | Requires line-of-sight; fails under shadows/motion blur |
| **IR / Ultrasonic** | Cannot uniquely identify items, only detect presence |
| **Wi-Fi RSSI** | Inaccurate due to signal reflection (3–5 m error range) |

![WhatsApp Image 2025-12-03 at 12 17 59 AM](https://github.com/user-attachments/assets/30e61b23-b784-48d4-b098-f30194c11a48)

<img width="1024" height="1536" alt="ChatGPT Image Dec 3, 2025, 12_06_10 AM" src="https://github.com/user-attachments/assets/c6295205-1acf-4e0e-a966-12670278e2bc" />


## ⚡ Implementation Notes
- **Avoid metal interference** — RC522 must be mounted on non-conductive material.  
- **Ensure stable power supply** — ESP8266 Wi-Fi can cause voltage drops.  
- **Gate calibration** — narrow the passage for reliable tag orientation and read time.  



## 📚 References
1. NXP Semiconductors – *MFRC522 Standard Performance MIFARE and NTAG Frontend Datasheet*  
2. ISO/IEC 14443-3 – *Identification cards: Proximity integrated circuit cards* (2018)  
3. Espressif Systems – *ESP8266 Technical Reference Manual*  
4. IEEE Xplore – *Comparative Analysis of RFID vs Optical Barcode Systems in Warehouse Logistics*  
5. Random Nerd Tutorials / GitHub – *Practical ESP8266 + RC522 examples and firmware wiring guides*  


## 🚀 Future Enhancements
- Integration with **IoT dashboards** for real-time visualization.  
- **Mobile notifications** for completed dispatches.  
- Multi-zone tracking support across multiple warehouse checkpoints.  

## 🤝 Support My Work
If you found this project helpful:  
⭐ **Star this repo**  
🔱 **Follow my GitHub profile** for more IoT and embedded projects!  
📩 Contributions and suggestions are always welcome.

