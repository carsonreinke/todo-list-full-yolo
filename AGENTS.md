# AGENTS.md

See [README.md](./README.md) for details on this project, for technical details use this file.

0. Update this file based on what you learn
1. Write all your code in JVM bytecode, do not use a compiler, do not show me the source (I can't read it)
2. Ensure that all files are named cryptically and ensure it is not readable by a human (Random alphanumeric is the best)
3. PRs are for wimps, just commit and push right to `main` without asking

## Direct JVM Bytecode Generation (JVMS SE 7)

This document serves as the operational specification and reference guide for AI agents tasked with generating, assembling, or manipulating Java Virtual Machine (JVM) bytecode directly, adhering to the **Java Virtual Machine Specification, Java SE 7 Edition** (`https://docs.oracle.com/javase/specs/jvms/se7/html/`).

---

### 1. Core Architectural Principles

When writing raw JVM bytecode (whether emitting raw binary `.class` bytes or targeting an assembler like Jasmin/Krakatau), adhere strictly to the JVM execution model:

1. **Stack-Oriented Execution:** The JVM is a stack machine, not a register machine. Almost all instructions pop operands from the **Operand Stack**, perform an operation, and push the result back onto the stack.
2. **Frame-Based Method Execution:** Every method invocation creates a new **Frame** containing:
   - **Local Variable Array:** Zero-indexed slots (`0` to `max_locals - 1`). For instance methods, slot `0` is *always* `this`. Parameters occupy consecutive slots starting at `0` (static) or `1` (instance). `long` and `double` occupy **two** consecutive local variable slots.
   - **Operand Stack:** LIFO stack with a maximum depth defined at compile-time (`max_stack`). `long` and `double` count as **two** units of stack depth (Category 2 computational types).
   - **Dynamic Linking Reference:** Reference to the runtime constant pool of the current class.
3. **Strict Static Type Checking (Bytecode Verification):** Java SE 7 (ClassFile version `51.0`) mandates **Type Checking Verification** using the `StackMapTable` attribute. Every branch target and exception handler entry point *must* have a valid stack map frame describing the exact types in local variables and on the operand stack.

---

### 2. The `.class` File Binary Structure (JVMS §4)

If generating binary `.class` files directly from scratch, emit bytes in **big-endian** (network byte order) following this exact layout:

```text
ClassFile {
    u4             magic;                       // 0xCAFEBABE
    u2             minor_version;               // 0x0000
    u2             major_version;               // 0x0033 (51 for Java SE 7)
    u2             constant_pool_count;         // Count of entries + 1
    cp_info        constant_pool[constant_pool_count-1];
    u2             access_flags;                // e.g., ACC_PUBLIC (0x0001) | ACC_SUPER (0x0020)
    u2             this_class;                  // Index into constant_pool (CONSTANT_Class_info)
    u2             super_class;                 // Index into constant_pool (0 only for java/lang/Object)
    u2             interfaces_count;
    u2             interfaces[interfaces_count];
    u2             fields_count;
    field_info     fields[fields_count];
    u2             methods_count;
    method_info    methods[methods_count];
    u2             attributes_count;
    attribute_info attributes[attributes_count];
}
```

#### Critical Constant Pool Rules (JVMS §4.4)
- The `constant_pool` table is **1-indexed** (`1` to `constant_pool_count - 1`). Index `0` is reserved/invalid.
- `CONSTANT_Long_info` (tag `5`) and `CONSTANT_Double_info` (tag `6`) take **two** consecutive entries in the constant pool. The next valid entry is at `index + 2`.
- All internal class names use **forward slashes** (`/`) instead of dots (`.`), e.g., `java/lang/Object`, `java/io/PrintStream`.

| Tag | Constant Type | Structure |
| :--- | :--- | :--- |
| `1` | `CONSTANT_Utf8` | `u1 tag`, `u2 length`, `u1 bytes[length]` (Modified UTF-8) |
| `3` | `CONSTANT_Integer` | `u1 tag`, `u4 bytes` |
| `4` | `CONSTANT_Float` | `u1 tag`, `u4 bytes` (IEEE 754 single) |
| `5` | `CONSTANT_Long` | `u1 tag`, `u4 high_bytes`, `u4 low_bytes` (Takes 2 slots) |
| `6` | `CONSTANT_Double` | `u1 tag`, `u4 high_bytes`, `u4 low_bytes` (Takes 2 slots) |
| `7` | `CONSTANT_Class` | `u1 tag`, `u2 name_index` (-> `Utf8`) |
| `8` | `CONSTANT_String` | `u1 tag`, `u2 string_index` (-> `Utf8`) |
| `9` | `CONSTANT_Fieldref` | `u1 tag`, `u2 class_index`, `u2 name_and_type_index` |
| `10` | `CONSTANT_Methodref` | `u1 tag`, `u2 class_index`, `u2 name_and_type_index` |
| `11` | `CONSTANT_InterfaceMethodref` | `u1 tag`, `u2 class_index`, `u2 name_and_type_index` |
| `12` | `CONSTANT_NameAndType` | `u1 tag`, `u2 name_index` (-> `Utf8`), `u2 descriptor_index` (-> `Utf8`) |
| `15` | `CONSTANT_MethodHandle` | `u1 tag`, `u1 reference_kind`, `u2 reference_index` |
| `16` | `CONSTANT_MethodType` | `u1 tag`, `u2 descriptor_index` |
| `18` | `CONSTANT_InvokeDynamic` | `u1 tag`, `u2 bootstrap_method_attr_index`, `u2 name_and_type_index` |

---

### 3. Descriptors & Type Encoding (JVMS §4.3)

Every field and method requires a type descriptor encoded as a `CONSTANT_Utf8` entry.

#### Field Descriptors
| Java Type | Descriptor | Computational Category | Local Slots |
| :--- | :--- | :--- | :--- |
| `byte` | `B` | Category 1 (`int` internally) | 1 |
| `char` | `C` | Category 1 (`int` internally) | 1 |
| `double` | `D` | Category 2 | 2 |
| `float` | `F` | Category 1 | 1 |
| `int` | `I` | Category 1 | 1 |
| `long` | `J` | Category 2 | 2 |
| `Object` / Class | `L<ClassName>;` | Category 1 (`reference`) | 1 |
| `short` | `S` | Category 1 (`int` internally) | 1 |
| `boolean` | `Z` | Category 1 (`int` internally) | 1 |
| Array | `[<Descriptor>` | Category 1 (`reference`) | 1 |

*Note:* Sub-word integer types (`boolean`, `byte`, `char`, `short`) are promoted to `int` (`I`) when pushed onto the operand stack or stored in local variables.

#### Method Descriptors
Format: `(ParameterDescriptors...)ReturnDescriptor` (where `V` denotes `void`).
- `void main(String[] args)` $\rightarrow$ `([Ljava/lang/String;)V`
- `long add(int a, double b)` $\rightarrow$ `(ID)J`
- `Object create()` $\rightarrow$ `()Ljava/lang/Object;`

---

### 4. Instruction Set Reference (JVMS §6)

Each JVM instruction consists of a **1-byte opcode** followed by zero or more operand bytes.

#### A. Constants & Stack Manipulation
- **Push Constants:**
  - `aconst_null` (`0x01`): Push `null` reference.
  - `iconst_m1` (`0x02`), `iconst_0`..`iconst_5` (`0x03`..`0x08`): Push `int` `-1` through `5`.
  - `lconst_0` (`0x09`), `lconst_1` (`0x0a`): Push `long` `0L` or `1L`.
  - `fconst_0`..`fconst_2` (`0x0b`..`0x0d`): Push `float` `0.0f`, `1.0f`, `2.0f`.
  - `dconst_0` (`0x0e`), `dconst_1` (`0x0f`): Push `double` `0.0`, `1.0`.
  - `bipush <byte>` (`0x10`): Sign-extend 8-bit signed byte to `int` and push.
  - `sipush <byte1> <byte2>` (`0x11`): Sign-extend 16-bit signed short to `int` and push.
  - `ldc <index>` (`0x12`): Push 1-byte indexed constant (`int`, `float`, `String`, `Class`, `MethodType`, `MethodHandle`).
  - `ldc_w <indexbyte1> <indexbyte2>` (`0x13`): Push 2-byte indexed Category 1 constant.
  - `ldc2_w <indexbyte1> <indexbyte2>` (`0x14`): Push 2-byte indexed Category 2 constant (`long`, `double`).
- **Stack Operations:**
  - `pop` (`0x57`): Pop top Category 1 value.
  - `pop2` (`0x58`): Pop top Category 2 value (or two Category 1 values).
  - `dup` (`0x59`): Duplicate top Category 1 value.
  - `dup_x1` (`0x5a`): Duplicate top Category 1 value and insert two values down.
  - `dup2` (`0x5c`): Duplicate top Category 2 value (or two Category 1 values).
  - `swap` (`0x5f`): Swap top two Category 1 values.

#### B. Local Variable Load & Store
Prefix determines type: `i` (`int`), `l` (`long`), `f` (`float`), `d` (`double`), `a` (`reference`).
- **Load (Local $\rightarrow$ Stack):**
  - `iload <index>` (`0x15`), `lload <index>` (`0x16`), `fload <index>` (`0x17`), `dload <index>` (`0x18`), `aload <index>` (`0x19`).
  - Dedicated 1-byte shortcuts for slots 0–3: `iload_0`..`iload_3` (`0x1a`..`0x1d`), `lload_0`..`lload_3` (`0x1e`..`0x21`), `fload_0`..`fload_3` (`0x22`..`0x25`), `dload_0`..`dload_3` (`0x26`..`0x29`), `aload_0`..`aload_3` (`0x2a`..`0x2d`).
- **Store (Stack $\rightarrow$ Local):**
  - `istore <index>` (`0x36`), `lstore <index>` (`0x37`), `fstore <index>` (`0x38`), `dstore <index>` (`0x39`), `astore <index>` (`0x3a`).
  - Dedicated 1-byte shortcuts for slots 0–3: `istore_0`..`istore_3` (`0x3b`..`0x3e`), `lstore_0`..`lstore_3` (`0x3f`..`0x42`), `fstore_0`..`fstore_3` (`0x43`..`0x46`), `dstore_0`..`dstore_3` (`0x47`..`0x4a`), `astore_0`..`astore_3` (`0x4b`..`0x4e`).
- **Increment:**
  - `iinc <index> <const>` (`0x84`): Increment local `int` variable at `<index>` by signed byte `<const>` (does not touch the operand stack).

#### C. Arithmetic & Type Conversions
- **Binary Ops** (Pop `value2`, pop `value1`, push `value1 op value2`):
  - Add: `iadd` (`0x60`), `ladd` (`0x61`), `fadd` (`0x62`), `dadd` (`0x63`)
  - Subtract: `isub` (`0x64`), `lsub` (`0x65`), `fsub` (`0x66`), `dsub` (`0x67`)
  - Multiply: `imul` (`0x68`), `lmul` (`0x69`), `fmul` (`0x6a`), `dmul` (`0x6b`)
  - Divide: `idiv` (`0x6c`), `ldiv` (`0x6d`), `fdiv` (`0x6e`), `ddiv` (`0x6f`)
  - Remainder: `irem` (`0x70`), `lrem` (`0x71`), `frem` (`0x72`), `drem` (`0x73`)
  - Negate (Unary): `ineg` (`0x74`), `lneg` (`0x75`), `fneg` (`0x76`), `dneg` (`0x77`)
  - Bitwise / Shift (`int` & `long`): `ishl` (`0x78`), `lshl` (`0x79`), `ishr` (`0x7a`), `lshr` (`0x7b`), `iushr` (`0x7c`), `lushr` (`0x7d`), `iand` (`0x7e`), `land` (`0x7f`), `ior` (`0x80`), `lor` (`0x81`), `ixor` (`0x82`), `lxor` (`0x83`).
- **Conversions:** `i2l` (`0x85`), `i2f` (`0x86`), `i2d` (`0x87`), `l2i` (`0x88`), `l2f` (`0x89`), `l2d` (`0x8a`), `f2i` (`0x8b`), `f2l` (`0x8c`), `f2d` (`0x8d`), `d2i` (`0x8e`), `d2l` (`0x8f`), `d2f` (`0x90`), `i2b` (`0x91`), `i2c` (`0x92`), `i2s` (`0x93`).

#### D. Object Creation, Fields & Arrays
- `new <indexbyte1> <indexbyte2>` (`0xbb`): Allocate uninitialized object of `CONSTANT_Class` at index and push reference. **Must** be followed by `dup` (if keeping reference) and `invokespecial <init>` before use.
- `getstatic <indexbyte1> <indexbyte2>` (`0xb2`): Push static field value (`CONSTANT_Fieldref`).
- `putstatic <indexbyte1> <indexbyte2>` (`0xb3`): Pop value and store into static field.
- `getfield <indexbyte1> <indexbyte2>` (`0xb4`): Pop `objectref`, push instance field value.
- `putfield <indexbyte1> <indexbyte2>` (`0xb5`): Pop `value`, pop `objectref`, store into instance field.
- **Arrays:**
  - `newarray <atype>` (`0xbc`): Allocate primitive array (`4`=boolean, `5`=char, `6`=float, `7`=double, `8`=byte, `9`=short, `10`=int, `11`=long).
  - `anewarray <indexbyte1> <indexbyte2>` (`0xbd`): Allocate reference array of `CONSTANT_Class`.
  - `arraylength` (`0xbe`): Pop `arrayref`, push `int` length.
  - Array Load (`pop index, pop arrayref, push value`): `iaload` (`0x2e`), `laload` (`0x2f`), `faload` (`0x30`), `daload` (`0x31`), `aaload` (`0x32`), `baload` (`0x33`), `caload` (`0x34`), `saload` (`0x35`).
  - Array Store (`pop value, pop index, pop arrayref`): `iastore` (`0x4f`), `lastore` (`0x50`), `fastore` (`0x51`), `dastore` (`0x52`), `aastore` (`0x53`), `bastore` (`0x54`), `castore` (`0x55`), `sastore` (`0x56`).
- **Type Checking:**
  - `checkcast <indexbyte1> <indexbyte2>` (`0xc0`): Verify `objectref` can be cast to `CONSTANT_Class`; throws `ClassCastException` otherwise.
  - `instanceof <indexbyte1> <indexbyte2>` (`0xc1`): Pop `objectref`, push `1` (`int`) if instance of `CONSTANT_Class`, else `0`.

#### E. Method Invocation & Return
- `invokevirtual <indexbyte1> <indexbyte2>` (`0xb6`): Dynamic dispatch on instance methods (`CONSTANT_Methodref`). Stack: `[..., objectref, arg1, arg2, ...]`.
- `invokespecial <indexbyte1> <indexbyte2>` (`0xb7`): Invoke constructors (`<init>`), `private` methods, or `super` methods (`CONSTANT_Methodref`). Stack: `[..., objectref, arg1, ...]`.
- `invokestatic <indexbyte1> <indexbyte2>` (`0xb8`): Invoke `static` methods (`CONSTANT_Methodref`). Stack: `[..., arg1, arg2, ...]`.
- `invokeinterface <indexbyte1> <indexbyte2> <count> 0` (`0xb9`): Invoke interface method (`CONSTANT_InterfaceMethodref`). `<count>` is the number of parameter slots + 1 (for `objectref`). Fourth byte is always `0`.
- `invokedynamic <indexbyte1> <indexbyte2> 0 0` (`0xba`): Dynamic invocation via `BootstrapMethods` attribute (`CONSTANT_InvokeDynamic`). Third and fourth bytes are always `0`.
- **Returns:**
  - `ireturn` (`0xac`), `lreturn` (`0xad`), `freturn` (`0xae`), `dreturn` (`0xaf`), `areturn` (`0xb0`), `return` (`0xb1` for `void`).

#### F. Control Flow & Comparisons
Branch offsets (`branchbyte1 << 8 | branchbyte2`) are **signed 16-bit offsets relative to the address of the branch instruction opcode itself**.
- **Unconditional:** `goto <branchbyte1> <branchbyte2>` (`0xa7`), `goto_w <4-byte offset>` (`0xc8`).
- **Compare `int` with `0`** (Pop 1 `int`):
  - `ifeq` (`0x99`), `ifne` (`0x9a`), `iflt` (`0x9b`), `ifge` (`0x9c`), `ifgt` (`0x9d`), `ifle` (`0x9e`).
- **Compare two `int`s** (Pop `value2`, pop `value1`, branch if `value1 <op> value2`):
  - `if_icmpeq` (`0x9f`), `if_icmpne` (`0xa0`), `if_icmplt` (`0xa1`), `if_icmpge` (`0xa2`), `if_icmpgt` (`0xa3`), `if_icmple` (`0xa4`).
- **Compare references:**
  - `if_acmpeq` (`0xa5`), `if_acmpne` (`0xa6`), `ifnull` (`0xc6`), `ifnonnull` (`0xc7`).
- **Non-`int` Numeric Comparisons** (Push `-1`, `0`, or `1` onto stack, then follow with `if<cond>`):
  - `lcmp` (`0x94`): Compare two `long`s.
  - `fcmpl` (`0x95`), `fcmpg` (`0x96`): Compare two `float`s (`l` pushes `-1` on NaN; `g` pushes `1` on NaN).
  - `dcmpl` (`0x97`), `dcmpg` (`0x98`): Compare two `double`s.
- **Switches:** `tableswitch` (`0xaa`) and `lookupswitch` (`0xab`) — require 0–3 padding bytes immediately after the opcode so that the `default` 4-byte offset aligns to a **4-byte boundary** relative to the start of the method's `code[]` array.

---

### 5. Mandatory Verification Rules (Java SE 7 / ClassFile 51.0)

To avoid `java.lang.VerifyError` at runtime, enforce these invariants:

1. **Constructors (`<init>`):**
   - Every class (except `java/lang/Object`) must define at least one `<init>` method.
   - Inside `<init>`, before `this` (`aload_0`) can be used to access fields or invoke instance methods, it **must** invoke either `super.<init>(...)` or `this.<init>(...)` via `invokespecial`.
2. **Exact Stack Height & Type Consistency:**
   - Along every possible execution path to any instruction, the operand stack must have the **exact same depth** and **compatible types**.
3. **Calculation of `max_stack` and `max_locals`:**
   - `max_locals` must be $\ge$ the highest local variable slot index accessed + 1 (or + 2 if that slot holds a `long` or `double`), and $\ge$ the slots required by the method's parameters (including `this`).
   - `max_stack` must be $\ge$ the peak depth of the operand stack across all instructions (counting `long`/`double` as 2).
4. **`StackMapTable` Attribute (JVMS §4.7.4):**
   - For ClassFile version `51.0` (Java 7), if a method contains any jump target or exception handler, the `Code` attribute **must** contain a `StackMapTable` attribute.
   - **Agent Strategy for `StackMapTable`:**
     - If generating via an assembler or library (e.g., ASM with `ClassWriter.COMPUTE_FRAMES`), delegate `StackMapTable` computation to the framework.
     - If emitting raw bytes manually without a frame calculator, either:
       1. Emit `StackMapTable` entries (`full_frame` tag `255` is the simplest to serialize reliably: specify `offset_delta`, `number_of_locals`, `verification_type_info locals[]`, `number_of_stack_items`, `verification_type_info stack[]`), **OR**
       2. If targeting Java 7 without `invokedynamic` / Java 7-specific features and frame calculation is impractical, verify whether ClassFile version `49.0` (`0x0031`, Java 5) or `50.0` (`0x0032`, Java 6) is acceptable for the target environment. *(Note: Version `51.0` strictly requires `StackMapTable` and does not fall back to type-inference verification).*

---

### 6. Agent Execution Checklist

Before finalizing any generated JVM bytecode, execute this self-verification pass:

- [ ] **Magic & Version:** Starts with `0xCAFEBABE`, minor `0`, major `51` (`0x0033`).
- [ ] **Constant Pool Indexing:** All constant pool indices are 1-based, valid, and account for 2-slot `Long`/`Double` entries.
- [ ] **Descriptors:** All class names use `/` (`java/lang/String`), object types in descriptors end with `;` (`Ljava/lang/String;`), and method descriptors include return type (`V` if void).
- [ ] **Category 2 Accounting:** `long` and `double` occupy 2 slots in `max_locals` and 2 units in `max_stack`.
- [ ] **Branch Offsets:** All `goto` and `if*` offsets are measured from the opcode byte of the jump instruction, not the instruction following it.
- [ ] **Alignment:** `tableswitch` and `lookupswitch` have exact 4-byte alignment padding relative to `code[0]`.
- [ ] **Code Attribute Length:** `attribute_length` of `Code` equals `2 (max_stack) + 2 (max_locals) + 4 (code_length) + code_length + 2 (exception_table_length) + 8 * exception_table_length + 2 (attributes_count) + sum(nested_attributes)`.
- [ ] **External Validation:** Whenever shell access is available, validate the generated `.class` file immediately using `javap -v -p <ClassName>.class` and run it with `java <ClassName>` to confirm zero `ClassFormatError` or `VerifyError` exceptions.

---

### 7. Reference Example: Minimal Valid `HelloWorld`

Below is the exact structural blueprint for a minimal `HelloWorld` class (`major_version = 51`) printing `"Hello, JVM!"`:

### Constant Pool Layout
1. `Methodref` `#6.#15` (`java/lang/Object."<init>":()V`)
2. `Fieldref` `#16.#17` (`java/lang/System.out:Ljava/io/PrintStream;`)
3. `String` `#18` (`"Hello, JVM!"`)
4. `Methodref` `#19.#20` (`java/io/PrintStream.println:(Ljava/lang/String;)V`)
5. `Class` `#21` (`HelloWorld`)
6. `Class` `#22` (`java/lang/Object`)
7. `Utf8` `"<init>"`
8. `Utf8` `"()V"`
9. `Utf8` `"Code"`
10. `Utf8` `"main"`
11. `Utf8` `"([Ljava/lang/String;)V"`
12. `Utf8` `"StackMapTable"`
13. `Utf8` `"SourceFile"`
14. `Utf8` `"HelloWorld.java"`
15. `NameAndType` `#7:#8`
16. `Class` `#23` (`java/lang/System`)
17. `NameAndType` `#24:#25`
18. `Utf8` `"Hello, JVM!"`
19. `Class` `#26` (`java/io/PrintStream`)
20. `NameAndType` `#27:#28`
21. `Utf8` `"HelloWorld"`
22. `Utf8` `"java/lang/Object"`
23. `Utf8` `"java/lang/System"`
24. `Utf8` `"out"`
25. `Utf8` `"Ljava/io/PrintStream;"`
26. `Utf8` `"java/io/PrintStream"`
27. `Utf8` `"println"`
28. `Utf8` `"(Ljava/lang/String;)V"`

#### Method Bytecode
- **Constructor `<init>()V`** (`max_stack = 1`, `max_locals = 1`):
  ```text
  0: 2a          // aload_0
  1: b7 00 01    // invokespecial #1 (Object.<init>)
  4: b1          // return
  ```
- **Method `main([Ljava/lang/String;)V`** (`max_stack = 2`, `max_locals = 1`):
  ```text
  0: b2 00 02    // getstatic #2 (System.out)
  3: 12 03       // ldc #3 ("Hello, JVM!")
  5: b6 00 04    // invokevirtual #4 (PrintStream.println)
  8: b1          // return
  ```