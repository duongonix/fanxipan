# fanxipan Deprecation Policy

Effective date: May 21, 2026.

## Muc tieu
- Bao dam API on dinh cho nguoi dung.
- Moi thay doi breaking phai co chu ky canh bao ro rang.
- Khong de "deprecated" ton tai vo thoi han.

## Quy tac
1. Moi API deprecated bat buoc co entry trong `schemas/deprecations.json`.
2. Moi entry bat buoc co:
- `id`
- `package`
- `kind` (`api` | `syntax` | `runtime`)
- `deprecatedIn`
- `removeIn`
- `announceDate` (ISO date)
- `migration`
3. Moi entry bat buoc duoc ghi trong `CHANGELOG.md`.
4. Den han `removeIn` phai remove API hoac doi `removeIn` kem giai trinh migration moi.

## Enforcement
- CI se chay script `pnpm run check:deprecations`.
- Script fail neu:
- thieu truong bat buoc,
- `removeIn` <= `deprecatedIn`,
- changelog khong co mention,
- da qua han `removeInDate`.

## Versioning
- Trong v0.x: cho phep deprecate nhanh hon, nhung van phai co migration.
- Tu v1.x tro di: canh bao >= 1 minor release truoc khi remove.


