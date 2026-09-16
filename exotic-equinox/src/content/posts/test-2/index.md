---
title: "Test 2 — Write-up แบบสรุปหลายโจทย์"
published: 2026-09-16
description: "ตัวอย่างแบบไม่มีรูปปก เปิดด้วยตารางสรุป แยกแต่ละโจทย์เป็นส่วนสั้น และพับเฉลยได้ เหมาะกับบันทึกหลายข้อในหน้าเดียว"
image: ""
tags: [CTF, Example, Forensics, Cryptography]
category: "CTF Writeup"
draft: false
lang: "th"
---

> **ข้อมูลสมมุติสำหรับเลือกแบบบทความ** — ชื่อโจทย์ คะแนน และ Flag ทั้งหมดเป็นตัวอย่าง ไม่มีผลการแข่งขันจริง

แบบนี้เริ่มด้วยเนื้อหาโดยไม่มีรูปปก เน้นอ่านเร็วและรวบรวมหลายข้อในหน้าเดียว แต่ละโจทย์มีข้อมูล แนวคิด และส่วนเฉลยที่กดเปิดได้

**ลองเทียบรูปแบบ:** [Test 1 — แบบเล่าเป็นขั้นตอน](/posts/test-1/) · [บทความ Cyber Hero](/posts/cyberheronakornchiangrai/cyber-hero-nakorn-chiangrai/)

## กระดานสรุป

| โจทย์สมมุติ | หมวด | คะแนนสมมุติ | ไปยังเนื้อหา |
| --- | --- | ---: | --- |
| Rotate Me | Cryptography | 100 | [อ่านโจทย์ A](#challenge-a) |
| Follow the Log | Forensics | 150 | [อ่านโจทย์ B](#challenge-b) |

**เครื่องมือที่ใช้:** Python 3 พร้อมโมดูลมาตรฐาน ไม่ต้องติดตั้งไลบรารีเพิ่มเติมสำหรับโค้ดตัวอย่าง

---

<h2 id="challenge-a">A — Rotate Me</h2>

**Cryptography** · Beginner · 100 คะแนนสมมุติ

### สิ่งที่โจทย์ให้

ข้อความด้านล่างมาพร้อมคำใบ้ว่า “หมุน 13 ตำแหน่ง”

```text title="cipher.txt"
PGS{ebg13_vf_fvzcyr}
```

### แนวคิดแบบย่อ

ลองใช้ ROT13 ซึ่งเลื่อนตัวอักษรภาษาอังกฤษ 13 ตำแหน่ง โดยคงเครื่องหมายและตัวเลขไว้ เมื่อลองกับ `PGS` จะได้ `CTF`

<details>
<summary>เปิดดูโค้ดและเฉลยโจทย์ A</summary>

```python title="solve_rot13.py"
import codecs

ciphertext = "PGS{ebg13_vf_fvzcyr}"
plaintext = codecs.decode(ciphertext, "rot_13")
print(plaintext)

# ROT13 สองครั้งต้องได้ข้อมูลเดิม
assert codecs.encode(plaintext, "rot_13") == ciphertext
```

ผลลัพธ์ที่คาดหวัง:

```text
CTF{rot13_is_simple}
```

**Flag สมมุติ:** `CTF{rot13_is_simple}`

</details>

### บันทึกหลังแก้

ROT13 เป็นการแทนที่ตัวอักษรแบบง่ายและไม่เหมาะกับการปกป้องข้อมูลลับ ในตัวอย่างนี้คำใบ้ช่วยลดจำนวนวิธีที่ต้องทดลอง

---

<h2 id="challenge-b">B — Follow the Log</h2>

**Forensics** · Beginner · 150 คะแนนสมมุติ

### สิ่งที่โจทย์ให้

โจทย์สมมุติให้ log สั้น ๆ ซึ่งมีข้อความทั่วไปปะปนกับ Flag:

```text title="activity.log"
09:00:00 INFO application started
09:00:01 INFO loaded demo configuration
09:00:02 DEBUG note=CTF{read_the_logs}
09:00:03 INFO application stopped
```

### แนวคิดแบบย่อ

อ่านทีละบรรทัดและค้นหารูปแบบ Flag พร้อมเก็บเลขบรรทัด เพื่ออ้างอิงตำแหน่งที่พบได้ ในข้อมูลสาธิตนี้ Flag เป็นข้อความธรรมดาและสามารถอ่านด้วยตาได้ด้วย

<details>
<summary>เปิดดูโค้ดและเฉลยโจทย์ B</summary>

```python title="solve_log.py"
import re

log = """09:00:00 INFO application started
09:00:01 INFO loaded demo configuration
09:00:02 DEBUG note=CTF{read_the_logs}
09:00:03 INFO application stopped"""

for line_number, line in enumerate(log.splitlines(), start=1):
    match = re.search(r"CTF\{[^}]+\}", line)
    if match:
        print(f"Line {line_number}: {match.group(0)}")
```

ผลลัพธ์ที่คาดหวัง:

```text
Line 3: CTF{read_the_logs}
```

**Flag สมมุติ:** `CTF{read_the_logs}`

</details>

### บันทึกหลังแก้

จดทั้งคำตอบและตำแหน่งที่พบ ในข้อมูลจริงข้อความที่ดูเหมือน Flag อาจเป็นตัวลวง จึงต้องตรวจสอบบริบทเพิ่มเติม

## Checklist ก่อนเผยแพร่

- [x] ระบุว่าโจทย์และคะแนนเป็นข้อมูลสมมุติ
- [x] แสดงข้อมูลต้นทางที่ใช้ในตัวอย่าง
- [x] ใส่โค้ดและผลลัพธ์ที่คาดหวัง
- [ ] แทนข้อความสาธิตด้วยเรื่องราวการแข่งขันของตัวเอง
- [ ] เพิ่มภาพหน้าจอจริงถ้าต้องการ

## เลือกรูปแบบที่เหมาะกับบทความ

| แบบ | การจัดเนื้อหา | เหมาะกับ |
| --- | --- | --- |
| [Test 1](/posts/test-1/) | มีรูปปก เล่าตามขั้นตอน วางรูปประกอบระหว่างเนื้อหา | อธิบายโจทย์เดียวอย่างละเอียด |
| Test 2 หน้านี้ | ไม่มีรูปปก ตารางรวมหลายข้อ และเฉลยแบบพับได้ | รวมโจทย์หลายข้อให้อ่านเร็ว |
| [Cyber Hero](/posts/cyberheronakornchiangrai/cyber-hero-nakorn-chiangrai/) | บทความยาว มีภาพรวมการแข่งขันและหลายโจทย์ | บันทึกภาพรวมของงาน |

---

[← กลับไปเลือกบทความทั้งหมด](/) · [ดู Test 1 →](/posts/test-1/)
