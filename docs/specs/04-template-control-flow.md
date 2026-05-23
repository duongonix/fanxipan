# 04 - Template Control Flow

Template parser chịu trách nhiệm parse block syntax đặc thù fanxipan.

## If block

AST: `IfBlock` + `ElifBlock[]` + `ElseBlock?`.

## For block

AST: `ForBlock` gồm item/index/iterable/key/empty.

## Await block

AST: `AwaitBlock` gồm nhánh pending/then/catch.

## Mục tiêu codegen

Sinh direct DOM operations cho từng nhánh, tái sử dụng anchor/comment nodes để insert/remove ổn định.


