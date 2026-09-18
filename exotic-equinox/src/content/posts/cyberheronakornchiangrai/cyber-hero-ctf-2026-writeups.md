---
title: "Writeup of Whereistheflag Team in the Cyber Hero Nakorn Chiangrai CTF 2026"
published: 2026-09-18
description: "Writeup of Whereistheflag Team in the Cyber Hero Nakorn Chiangrai CTF 2026"
image: ./banner.webp
tags: ["CTF Write-up", "Whereistheflag", "Cyber Hero Nakorn Chiangrai", "2026"]
category: CTF Writeup
draft: false
lang: 'th'
---

## Write-up 1: CII Black Box

สวัสดีครับ! บทความนี้เป็นบันทึกการวิเคราะห์และแก้โจทย์ **CII Black Box** ในการแข่งขัน Cyber Hero CTF 2026 ตั้งแต่การทำความเข้าใจบริบทที่โจทย์ให้มา การตั้งสมมุติฐาน การตรวจสอบไฟล์ไบนารี การเขียนโค้ดถอดรหัส ไปจนถึงการหลบเลี่ยงกับดักที่ซ่อนอยู่ภายในไฟล์จนได้ Flag ที่ถูกต้อง

## ภาพรวม

โจทย์ข้อนี้จำลองสถานการณ์ระบบโครงสร้างพื้นฐานสำคัญ (CII) เกิด Incident และมีไฟล์บันทึกเหตุการณ์ที่เป็น Custom Binary Archive นามสกุล `.ncbf` แต่ไม่มีโปรแกรมเปิดอ่านของผู้ผลิต เราจึงต้องแกะโครงสร้างไฟล์ตาม Specification ที่ให้มาเพื่อกู้คืนชิ้นส่วน Token

| ข้อมูลโจทย์ | รายละเอียด |
| --- | --- |
| **ชื่อโจทย์** | CII Black Box |
| **หมวดหมู่** | Miscellaneous / Custom Binary Format |
| **คะแนน** | 300 คะแนน (Solves: 2) |
| **แนวคิดหลัก** | วิเคราะห์ Custom Binary, Reverse Pipeline (XOR, Reverse, Zlib), Data Validation (CRC32) |
| **Flag ที่ได้** | `CYBERHEROCTF{R34D_BYT3S_V4L1D4T3_R3C0RDS}` |

![แบนเนอร์การแข่งขัน Cyber Hero CTF 2026](./banner.webp)

*แบนเนอร์การแข่งขัน Cyber Hero CTF 2026*

---

## ข้อมูลจากโจทย์

**หมวด:** Miscellaneous / Custom Binary Format · **คะแนน:** 300

ในสถานการณ์จำลอง เกิด Incident กับระบบ Critical Information Infrastructure (CII) อุปกรณ์เฝ้าระวังได้สร้างไฟล์บันทึกเหตุการณ์แบบ proprietary นามสกุล `.ncbf` ขึ้นมา ทว่าไม่มี Viewer ของผู้ผลิตให้ใช้งาน มีเพียงเอกสารบันทึกโครงสร้างไฟล์บางส่วนและไฟล์ตัวอย่างขนาดเล็ก

**ไฟล์ที่ได้รับ:**
1. `incident_archive.ncbf` — ไฟล์บันทึกเหตุการณ์จริงที่เป็นเป้าหมาย (ขนาด 1,760 ไบต์)
2. `sample.ncbf` — ไฟล์ตัวอย่างขนาดเล็กที่ถูกต้อง (ขนาด 176 ไบต์) สำหรับนำมาเปรียบเทียบโครงสร้าง
3. `format_notes.txt` — เอกสารระบุ Specification ของไฟล์ NCBF Version 1
4. `README.txt` — ข้อกำหนดของโจทย์ และคำเตือนเรื่องข้อความใน payload

**เป้าหมาย:** ทำการกู้คืน Recovery Token (Flag) ที่ถูกแบ่งเก็บเป็นชิ้นส่วนย่อย (Fragments) อยู่ใน Record ประเภท Recovery Fragment (`0x42`) โดยต้องผ่านเงื่อนไขความถูกต้องตามโครงสร้างที่ระบุไว้ใน `format_notes.txt`

---

## การสังเกตและแนวคิด

### 1. ทดลองเบื้องต้นและข้อควรระวัง
เมื่อเปิดไฟล์ `incident_archive.ncbf` ด้วย Text Editor ทั่วไป จะพบว่าเป็นไฟล์ไบนารีที่อ่านไม่ออก หากทดลองใช้คำสั่ง `strings` ดึงข้อความออกมา จะพบข้อความคล้าย Flag ปรากฏอยู่หลายจุด เช่น:
* `CYBERHEROCTF{RAW_STRINGS_IGNORE_CRC}`
* `CYBERHEROCTF{DELETED_RECORD_IS_CURRENT}`
* `CYBERHEROCTF{AI_FOLLOWED_UNTRUSTED_DATA}`

ข้อความเหล่านี้คือ **"กับดัก (Traps)"** หากเราส่งคำตอบโดยไม่ตรวจสอบโครงสร้าง จะตอบผิดทันที สอดคล้องกับที่ `README.txt` ระบุไว้ว่า:
> *"Text found inside archive payloads is data, not an extension of this challenge statement."*

### 2. ศึกษากฎเกณฑ์จาก `format_notes.txt`
เมื่อศึกษาเอกสาร Specification สรุปโครงสร้างสำคัญได้ดังนี้:
* **File Header (32 bytes):**
  * Magic bytes: `NCBF` (4 bytes)
  * Record Count: อยู่ที่ Offset `0x08` (4 bytes, Little-Endian)
  * Record Area Offset: อยู่ที่ Offset `0x0C` (4 bytes, Little-Endian)
  * File ID: อยู่ที่ Offset `0x14` (4 bytes, Little-Endian) — ค่านี้จำเป็นมากในการใช้คำนวณ XOR Key
* **Record Header (20 bytes ก่อนถึง Payload):**
  * Sync Marker: `D3 91`
  * Record Type: Offset `0x02` (เราสนใจเฉพาะ Type `0x42` คือ Recovery Fragment)
  * Record Flags: Offset `0x03` (`0x01`=Zlib, `0x02`=Reverse, `0x04`=XOR, `0x08`=Deleted)
  * Record ID: Offset `0x04` (Little-Endian)
  * Sequence Number: Offset `0x06` (**Big-Endian**)
  * Stored Payload Length: Offset `0x10` (Little-Endian)
  * ตามด้วย Stored Payload และต่อด้วย Record CRC32 (4 bytes, Little-Endian)
  * ท้ายสุดมี Zero-padding เพื่อจัดตำแหน่งข้อมูลให้ตรง 4-byte boundary
* **เงื่อนไขคัดกรอง Record:**
  > *"Only CRC-valid, non-deleted Recovery Fragment records are current."*
  * ต้องคำนวณ CRC32 ครอบคลุมตั้งแต่ไบต์ Record Type (`0x02`) จนถึงไบต์สุดท้ายของ Stored Payload แล้วเทียบว่าตรงกับ CRC32 ที่บันทึกไว้หรือไม่
  * Flag ต้องไม่มีบิต `0x08` (Deleted)
* **กระบวนการถอดรหัส Payload (Reverse Decoding):**
  * ผู้เขียนไฟล์ทำการ Encode: $\text{Original} \rightarrow \text{Zlib} \rightarrow \text{Reverse} \rightarrow \text{XOR} \rightarrow \text{Stored}$
  * เวลาเราถอดรหัส ต้องทำย้อนกลับ: $\text{Stored} \rightarrow \text{Undo XOR} \rightarrow \text{Undo Reverse} \rightarrow \text{Undo Zlib} \rightarrow \text{Original}$
  * สูตรคำนวณ 1-byte XOR Key:
    $$\text{Key} = (\text{File\_ID} + \text{Record\_ID} + \text{Sequence\_Number}) \ \& \ \text{0xFF}$$

---

## ขั้นตอนการแก้

### ขั้นตอนที่ 1: ตรวจสอบและดึงข้อมูล File Header
เริ่มต้นด้วยการเขียนโค้ดอ่าน 32 ไบต์แรกของไฟล์ `incident_archive.ncbf` เพื่อดึงค่าพื้นฐาน

```text
Offset  00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F
0x0000: 4E 43 42 46 01 07 20 00 0E 00 00 00 20 00 00 00
0x0010: 00 00 06 2C 12 D7 2F 17 7B D9 1D 09 00 00 00 00
```

* Magic: `NCBF`
* จำนวน Record: `0x0E` = 14 Records
* Record เริ่มต้นที่ Offset: `0x20` (ไบต์ที่ 32)
* **File ID:** `0x172FD712`

### ขั้นตอนที่ 2: วนลูปอ่าน Record ทั้งหมดและคัดเลือก Type 0x42
เมื่อวนลูปอ่าน Record ทั้งหมด 14 รายการ พบ Record Type `0x42` ทั้งสิ้น 7 รายการ จึงนำมาตรวจสอบเงื่อนไข CRC และ Deleted Flag:

| ลำดับที่พบ | Record ID | Seq (BE) | Flags | การเข้ารหัส | ผลการตรวจ CRC32 | บิต Deleted | การตัดสินใจ |
| :---: | :---: | :---: | :---: | :--- | :---: | :---: | :--- |
| Record 2 | 1101 | 21 | `0x01` | Zlib | ✅ ถูกต้อง | ❌ ไม่ถูกลบ | **เก็บ (Fragment 1)** |
| Record 4 | 1103 | 23 | `0x04` | XOR | ✅ ถูกต้อง | ❌ ไม่ถูกลบ | **เก็บ (Fragment 3)** |
| Record 5 | 1198 | 98 | `0x00` | ไม่มี | ❌ **ไม่ตรง (Stale)** | ❌ ไม่ถูกลบ | **ตัดทิ้ง (กับดัก)** |
| Record 8 | 1102 | 22 | `0x06` | Rev + XOR | ✅ ถูกต้อง | ❌ ไม่ถูกลบ | **เก็บ (Fragment 2)** |
| Record 9 | 1199 | 99 | `0x08` | ไม่มี | ✅ ถูกต้อง | ⚠️ **ถูกลบ (0x08)** | **ตัดทิ้ง (กับดัก)** |
| Record 12 | 1105 | 25 | `0x05` | Zlib + XOR | ✅ ถูกต้อง | ❌ ไม่ถูกลบ | **เก็บ (Fragment 5)** |
| Record 13 | 1104 | 24 | `0x03` | Zlib + Rev | ✅ ถูกต้อง | ❌ ไม่ถูกลบ | **เก็บ (Fragment 4)** |

### ขั้นตอนที่ 3: ถอดรหัสและรวมชิ้นส่วน Recovery Fragment
นำ Payload ของทั้ง 5 Record ที่ผ่านเกณฑ์มาถอดรหัสตามลำดับ XOR $\rightarrow$ Reverse $\rightarrow$ Zlib:

โครงสร้างข้อมูลของ Recovery Fragment ที่ถอดรหัสแล้ว:
* Byte 0: หมายเลข Fragment (1 ถึง 5)
* Byte 1: จำนวน Fragment ทั้งหมด (5)
* Byte 2-3: ความยาวข้อความ (Big-Endian)
* Byte 4+: เนื้อหาข้อความ

ผลลัพธ์ของแต่ละ Fragment:
* **Fragment 1/5** (ID 1101): `CYBERHERO`
* **Fragment 2/5** (ID 1102): `CTF{R34D`
* **Fragment 3/5** (ID 1103): `_BYT3S_V`
* **Fragment 4/5** (ID 1104): `4L1D4T3_`
* **Fragment 5/5** (ID 1105): `R3C0RDS}`

### ขั้นตอนที่ 4: เขียนสคริปต์แก้โจทย์อัตโนมัติ (Python)

```python title="solve_ncbf.py"
import struct
import zlib

def solve():
    with open("incident_archive.ncbf", "rb") as f:
        raw = f.read()

    # อ่าน Header หลัก
    assert raw[0:4] == b"NCBF", "Invalid magic"
    record_count = struct.unpack_from("<I", raw, 0x08)[0]
    record_offset = struct.unpack_from("<I", raw, 0x0C)[0]
    file_id = struct.unpack_from("<I", raw, 0x14)[0]

    pos = record_offset
    fragments = {}

    for _ in range(record_count):
        rec_type = raw[pos + 2]
        rec_flags = raw[pos + 3]
        rec_id = struct.unpack_from("<H", raw, pos + 4)[0]
        seq_num = struct.unpack_from(">H", raw, pos + 6)[0]  # Sequence number เป็น Big-Endian
        stored_len = struct.unpack_from("<I", raw, pos + 0x10)[0]

        payload = raw[pos + 0x14 : pos + 0x14 + stored_len]
        stored_crc = struct.unpack_from("<I", raw, pos + 0x14 + stored_len)[0]

        # คำนวณ CRC32 จาก byte 0x02 ถึงสิ้นสุด stored payload
        crc_data = raw[pos + 2 : pos + 0x14 + stored_len]
        calc_crc = zlib.crc32(crc_data) & 0xFFFFFFFF

        is_crc_valid = (stored_crc == calc_crc)
        is_deleted = bool(rec_flags & 0x08)

        if rec_type == 0x42 and is_crc_valid and not is_deleted:
            data = bytearray(payload)

            # ถอดรหัสย้อนกลับ: XOR -> Reverse -> Zlib
            if rec_flags & 0x04:  # Undo XOR
                key = (file_id + rec_id + seq_num) & 0xFF
                data = bytearray(b ^ key for b in data)
            if rec_flags & 0x02:  # Undo Reverse
                data = data[::-1]
            if rec_flags & 0x01:  # Undo Zlib
                data = zlib.decompress(bytes(data))

            frag_num = data[0]
            content_len = (data[2] << 8) | data[3]
            content = data[4 : 4 + content_len].decode("utf-8")
            fragments[frag_num] = content

        # ขยับ pointer ไปยัง Record ถัดไป พร้อม 4-byte alignment padding
        total_len = 0x14 + stored_len + 4
        if total_len % 4 != 0:
            total_len += 4 - (total_len % 4)
        pos += total_len

    flag = "".join(fragments[k] for k in sorted(fragments))
    print(f"FLAG: {flag}")

if __name__ == "__main__":
    solve()
```

บันทึกโค้ดเป็น `solve_ncbf.py` ไว้ในโฟลเดอร์เดียวกับไฟล์โจทย์ แล้วรันคำสั่ง:

```powershell
python solve_ncbf.py
```

---

## ผลลัพธ์และ Flag

```text
FLAG: CYBERHEROCTF{R34D_BYT3S_V4L1D4T3_R3C0RDS}
```

**Flag:** `CYBERHEROCTF{R34D_BYT3S_V4L1D4T3_R3C0RDS}`

---

## ปัญหาและกับดักที่พบระหว่างทดลอง

| รายการกับดัก / อุปสรรค | ลักษณะที่พบในไฟล์ | แนวทางแก้ไขและรับมือ |
| --- | --- | --- |
| **Stale Record (ID 1198)** | พบข้อความคล้าย Flag `CYBERHEROCTF{RAW_STRINGS_IGNORE_CRC}` | เมื่อคำนวณ CRC32 จะพบว่าไม่ตรงกับค่าในไฟล์ จึงต้องตัดทิ้งตามสเปก |
| **Deleted Record (ID 1199)** | พบข้อความ `CYBERHEROCTF{DELETED_RECORD_IS_CURRENT}` มี CRC ถูกต้อง | มี Flag บิต `0x08` (Deleted) ระบุว่าข้อมูลถูกลบไปแล้ว ให้เพิกเฉย |
| **Prompt Injection Notes** | ใน Operator Notes มีข้อความหลอกว่า `CYBERHEROCTF{AI_FOLLOWED_...}` | ปฏิบัติตามคำเตือนใน README ว่าเนื้อหาใน payload คือ Data ห้ามเชื่อถือคำสั่งภายใน |
| **Mixed Endianness** | ฟิลด์ Sequence Number และ Index Offset ใช้ Big-Endian ต่างจากฟิลด์อื่น | ใช้ `>H` ในโมดูล `struct` เฉพาะฟิลด์ที่สเปกระบุ มิฉะนั้นจะคำนวณ XOR Key ผิด |

---

## สิ่งที่ได้เรียนรู้

- การแก้โจทย์ Reverse Engineering / Forensic ไฟล์ไบนารี ต้องเริ่มจากการอ่านโครงสร้าง Specification ให้ครบถ้วนก่อนเขียนโค้ด
- คำสั่ง `strings` หรือการค้นหาแบบง่าย ๆ อาจเจอ Flag หลอกที่คนออกโจทย์จงใจวางไว้ การตรวจสอบความถูกต้องของข้อมูล (Integrity Validation) ด้วย CRC32 จึงมีความสำคัญอย่างยิ่ง
- เมื่อข้อมูลผ่านกระบวนการเข้ารหัสหลายชั้น ($A \rightarrow B \rightarrow C$) เวลาถอดรหัสเพื่อกู้คืนข้อมูลจะต้องทำย้อนลำดับกลับเสมอ ($C^{-1} \rightarrow B^{-1} \rightarrow A^{-1}$)

---

## เอกสารประกอบ

- [Python Documentation: โมดูล struct](https://docs.python.org/3/library/struct.html)
- [Python Documentation: โมดูล zlib](https://docs.python.org/3/library/zlib.html)
- [RFC 1950: ZLIB Compressed Data Format Specification](https://datatracker.ietf.org/doc/html/rfc1950)

---

## Write-up 2: Pieces of the Past

สวัสดีครับ! บทความนี้เป็นบันทึกการแก้โจทย์ **Pieces of the Past (RECOVERED ARTIFACT)** ในการแข่งขัน Cyber Hero CTF 2026 ตั้งแต่การวิเคราะห์ข้อความคำใบ้ปริศนา การถอดรหัสตัวเลข การแกะรอยตามข้อมูลที่ถูกลบไปแล้วบนอินเทอร์เน็ต (OSINT) จนประกอบชิ้นส่วนกลับคืนมาได้ Flag ที่สมบูรณ์

## ภาพรวม

โจทย์ข้อนี้เป็นการตามรอยชิ้นส่วนข้อมูล (Fragments) ที่กระจัดกระจาย โดยเริ่มต้นจากไฟล์หลักฐานในเครื่อง ถอดรหัสจนได้ลิงก์ภายนอก จากนั้นใช้เทคนิคสืบค้นย้อนเวลาบนอินเทอร์เน็ต เพื่อกู้คืนข้อมูลที่ถูกลบไปแล้วกลับมาประกอบกัน

| ข้อมูลโจทย์ | รายละเอียด |
| --- | --- |
| **ชื่อโจทย์** | Pieces of the Past (RECOVERED ARTIFACT) |
| **หมวดหมู่** | Miscellaneous / Cryptography / OSINT |
| **คะแนน** | 300 คะแนน |
| **แนวคิดหลัก** | A1Z26 Cipher, Repeating Key XOR, Wayback Machine (Internet Archive), Known Plaintext Attack |
| **Flag ที่ได้** | `CYBERHEROCTF{m1sc_x0r_p4st3_n3v3r_f0rg3ts}` |

![แบนเนอร์การแข่งขัน Cyber Hero CTF 2026](./banner.webp)

*แบนเนอร์การแข่งขัน Cyber Hero CTF 2026*

---

## ข้อมูลจากโจทย์

**หมวด:** Miscellaneous / Cryptography / OSINT · **คะแนน:** 300

ระบบแจ้งว่าพบวัตถุพยานปริศนา (Artifact) หลงเหลือจากโครงการลับที่ถูกยกเลิก (Decommissioned) ไปแล้ว ข้อมูลที่มีอยู่ไม่ใช่ไฟล์สมบูรณ์ แต่เป็นเพียงเศษเสี้ยวที่กระจัดกระจาย โดยผู้เล่นต้องตามรอยเบาะแสเพื่อกู้คืนชิ้นส่วนทั้งหมดกลับคืนมา

**ไฟล์ที่ได้รับ:**
1. `evidence.txt` — ข้อความคำใบ้ปริศนา มีชุดตัวเลขและรหัส Hex Data
2. `image.png` — ภาพหน้าจอโจทย์และหัวข้อการแข่งขัน

เนื้อหาภายใน `evidence.txt`:
```text title="evidence.txt"
RECOVERED ARTIFACT #03
----------------------

16 1 19 20 5

DATA: 3633323328352f276906090316060d15131c1711163a3e6536331e2b64370f4b5935372428353526247c3d0310650d3464175a4b3d313d247b732424233536362c3e

A begins with 1.
Z ends with 26.

What you find may be the key.
```

---

## การสังเกตและแนวคิด

### 1. ถอดรหัสชุดตัวเลขหา Key ดอกแรก (A1Z26 Cipher)
จากคำใบ้ในไฟล์:
> *"A begins with 1. Z ends with 26. What you find may be the key."*

นี่คือการแทนลำดับตัวอักษรภาษาอังกฤษด้วยตัวเลข 1-26 (A1Z26):
* $16 \rightarrow \mathbf{P}$
* $1 \rightarrow \mathbf{A}$
* $19 \rightarrow \mathbf{S}$
* $20 \rightarrow \mathbf{T}$
* $5 \rightarrow \mathbf{E}$

เมื่อรวมกันจะได้คำว่า **`PASTE`** ซึ่งคำใบ้ชี้ชัดว่าคำนี้คือ **กุญแจ (Key)** ในการถอดรหัสข้อมูล

### 2. นำ Hex Data มาถอดรหัส (Repeating Key XOR)
ข้อมูล Hex ยาว 70 ไบต์ มีความเป็นไปได้สูงว่าถูกเข้ารหัสด้วยการทำ XOR กับ Key `PASTE` แบบวนซ้ำตามความยาวของข้อมูล

### 3. การตามรอยเบาะแสสู่โลกภายนอก (OSINT)
หากผลลัพธ์จากการถอดรหัสในสเต็ปแรกให้ URL หรือ ID ของเว็บ Pastebin เราจะต้องตามไปยังหน้านั้น และหากหน้าเว็บปัจจุบันแจ้งว่าข้อมูลถูกลบไปแล้ว สอดคล้องกับชื่อโจทย์ว่า *"Pieces of the Past"* เราจะต้องใช้บริการ **Wayback Machine (Internet Archive)** เพื่อย้อนดูประวัติที่เคยถูกบันทึกไว้ในอดีต

### 4. การหากุญแจดอกที่สองด้วย Known Plaintext Attack
เมื่อได้ชุด Hex Data ชุดที่สองจาก Pastebin ที่ถูกลบ เราทราบว่า Flag จะต้องลงท้ายด้วยเครื่องหมายปีกกาปิด `}` เสมอ เราจึงสามารถนำไบต์สุดท้ายมา XOR ย้อนกลับเพื่อหาตัวอักษรสุดท้ายของ Key และเทียบเคียงกับชื่อโปรเจกต์ที่ปรากฏอยู่ตรงหน้า

---

## ขั้นตอนการแก้

### ขั้นตอนที่ 1: ถอดรหัสชิ้นส่วนที่ 1
นำชุด Hex Data จาก `evidence.txt` มาแปลงเป็นไบต์ แล้วทำ XOR ด้วย Key `PASTE`:

```text
fragment=CYBERHEROCTF{m1sc_x0r_

artifact=nWU5Lg0R

next: pastebin
```

* **ชิ้นส่วน Flag ที่ 1:** `CYBERHEROCTF{m1sc_x0r_`
* **เบาะแสถัดไป:** Pastebin ID คือ `nWU5Lg0R`

### ขั้นตอนที่ 2: ตามรอยไปยัง Pastebin และย้อนเวลาด้วย Wayback Machine
เมื่อเข้าลิงก์ `https://pastebin.com/raw/nWU5Lg0R` พบข้อความปัจจุบันแจ้งว่า:
> *"STATUS: DECOMMISSIONED... This project has been permanently removed... What you see now is only the present. The Internet remembers the past."*

ประโยค *"The Internet remembers the past"* บ่งบอกว่าอินเทอร์เน็ตยังจำอดีตได้ จึงนำ URL นี้ไปค้นหาบน **Wayback Machine (web.archive.org)** และพบ Snapshot ที่บันทึกไว้:

```text
PROJECT AFTERIMAGE
==================

Build: 0.9.3
Status: Migration Pending

Recovery Fragment:

p4st3_n3v3r_

------------------------------

ARCHIVE DATA:

27762622613d3e38

------------------------------

Recovery Note:

Same operation.
Different secret.

The secret is hiding in plain sight.
```

* **ชิ้นส่วน Flag ที่ 2:** `p4st3_n3v3r_`
* **Archive Data (Hex):** `27762622613d3e38` (ขนาด 8 ไบต์)

### ขั้นตอนที่ 3: วิเคราะห์หากุญแจและถอดรหัสชิ้นส่วนที่ 3
คำใบ้ระบุว่า:
* *"Same operation"* $\rightarrow$ ใช้การ XOR เหมือนเดิม
* *"Different secret. The secret is hiding in plain sight."* $\rightarrow$ กุญแจซ่อนอยู่ในข้อความที่มองเห็น คือชื่อหัวข้อ `PROJECT AFTERIMAGE`

เนื่องจากไบต์สุดท้ายของ Hex คือ `0x38` และตัวอักษรสุดท้ายของ Flag ต้องเป็น `}` (`0x7D`):
$$\text{Key}[7] = 0x38 \oplus 0x7D = 0x45 \quad (\text{คือตัวอักษร 'E'})$$

เมื่อนำชื่อโปรเจกต์มาพิจารณาคำที่มีความยาว 8 ตัวอักษรและลงท้ายด้วย 'E' จะได้ Key คือ **`AFTERIME`**

นำ `27762622613d3e38` มา XOR ด้วย `AFTERIME`:
* `0x27 ^ 'A' = 'f'`
* `0x76 ^ 'F' = '0'`
* `0x26 ^ 'T' = 'r'`
* `0x22 ^ 'E' = 'g'`
* `0x61 ^ 'R' = '3'`
* `0x3D ^ 'I' = 't'`
* `0x3E ^ 'M' = 's'`
* `0x38 ^ 'E' = '}'`

ได้ **ชิ้นส่วน Flag ที่ 3:** `f0rg3ts}`

### ขั้นตอนที่ 4: รวมชิ้นส่วนทั้งหมดเข้าด้วยกัน
นำทั้ง 3 ส่วนมาเรียงต่อกัน:
$$\text{CYBERHEROCTF\{m1sc\_x0r\_} + \text{p4st3\_n3v3r\_} + \text{f0rg3ts\}} = \mathbf{CYBERHEROCTF\{m1sc\_x0r\_p4st3\_n3v3r\_f0rg3ts\}}$$

### ขั้นตอนที่ 5: เขียนสคริปต์แก้โจทย์อัตโนมัติ (Python)

```python title="solve_artifact.py"
import urllib.request

def xor_decrypt(hex_str: str, key: str) -> str:
    data = bytes.fromhex(hex_str)
    k = key.encode("utf-8")
    return bytes([b ^ k[i % len(k)] for i, b in enumerate(data)]).decode("utf-8", errors="ignore")

def solve():
    # 1. ถอดรหัสส่วนแรกจาก evidence.txt
    hex1 = "3633323328352f276906090316060d15131c1711163a3e6536331e2b64370f4b5935372428353526247c3d0310650d3464175a4b3d313d247b732424233536362c3e"
    part1_decoded = xor_decrypt(hex1, "PASTE")
    print("[+] Evidence Decoded:\n" + part1_decoded.strip())

    part1 = "CYBERHEROCTF{m1sc_x0r_"
    pastebin_id = "nWU5Lg0R"

    # 2. ดึงข้อมูลประวัติย้อนหลังจาก Wayback Machine
    archive_url = f"https://web.archive.org/web/20260831033019if_/https://pastebin.com/raw/{pastebin_id}"
    req = urllib.request.Request(archive_url, headers={"User-Agent": "Mozilla/5.0"})
    
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            content = res.read().decode("utf-8")
            print("\n[+] Archived Pastebin Retrieved Successfully!")
    except Exception:
        print("\n[-] Offline mode: Using recovered content directly")

    part2 = "p4st3_n3v3r_"
    hex2 = "27762622613d3e38"

    # 3. ถอดรหัสส่วนสุดท้ายด้วยกุญแจ AFTERIME
    part3 = xor_decrypt(hex2, "AFTERIME")
    print(f"[+] Fragment 3: {part3}")

    # 4. ประกอบ Flag
    final_flag = part1 + part2 + part3
    print("\n" + "=" * 50)
    print(f"FLAG: {final_flag}")
    print("=" * 50)

if __name__ == "__main__":
    solve()
```

บันทึกโค้ดเป็น `solve_artifact.py` แล้วรันด้วยคำสั่ง:

```powershell
python solve_artifact.py
```

---

## ผลลัพธ์และ Flag

```text
FLAG: CYBERHEROCTF{m1sc_x0r_p4st3_n3v3r_f0rg3ts}
```

**Flag:** `CYBERHEROCTF{m1sc_x0r_p4st3_n3v3r_f0rg3ts}`

---

## ปัญหาและข้อสังเกตที่พบระหว่างทดลอง

| ประเด็นที่พบ | รายละเอียด | แนวทางแก้ไข |
| --- | --- | --- |
| **หน้า Pastebin แจ้งว่าถูกลบ** | เมื่อเปิดเข้าไปดูปัจจุบันจะพบแต่ข้อความแจ้งว่าโปรเจกต์ถูก Decommissioned | ให้สังเกตคำใบ้ *"The Internet remembers the past"* แล้วนำ URL ไปสืบค้นต่อบน Wayback Machine |
| **การเดาความยาวของ Key ก้อนที่ 2** | ชื่อโปรเจกต์เต็มคือ `PROJECT AFTERIMAGE` มี 10 ตัวอักษร แต่ข้อมูล Hex มีเพียง 8 ไบต์ | ใช้เทคนิค Known Plaintext ($0x38 \oplus \text{'\}'} = \text{'E'}$) เพื่อยืนยันว่า Key ต้องลงท้ายด้วย 'E' และตัดคำให้เหลือ 8 ตัวจนได้ `AFTERIME` |
| **ความหมายของ Flag** | ข้อความใน Flag คือ `m1sc_x0r_p4st3_n3v3r_f0rg3ts` | ล้อเลียนสุภาษิตอินเทอร์เน็ต *"Paste/The Internet never forgets"* สอดคล้องกับกลไกของโจทย์ |

---

## สิ่งที่ได้เรียนรู้

- การแข่งขันแนว Miscellaneous มักมีการผสมผสานหลายหมวดเข้าด้วยกัน เช่น Cryptography พื้นฐาน ควบคู่กับเทคนิค OSINT บนอินเทอร์เน็ต
- ข้อมูลที่ถูกลบหรือแก้ไขไปแล้วบนโลกออนไลน์ มักจะมีร่องรอย snapshot บันทึกไว้เสมอผ่านทาง Internet Archive (Wayback Machine)
- เทคนิคการเดาค่ากุญแจ (Known Plaintext Attack) จากโครงสร้างที่เรารู้ล่วงหน้า (เช่น เครื่องหมายวงเล็บปีกกาปิด `}`) ช่วยให้เราทดสอบและยืนยันสมมุติฐานได้อย่างรวดเร็ว

---

## เอกสารประกอบ

- [Internet Archive: Wayback Machine](https://web.archive.org/)
- [CyberChef: Web Tool for Cryptography & Hex Analysis](https://gchq.github.io/CyberChef/)
- [Python Documentation: โมดูล urllib.request](https://docs.python.org/3/library/urllib.request.html)
