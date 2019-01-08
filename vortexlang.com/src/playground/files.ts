function blockTrim(text: string) {
  let lines = text.split('\n');

  while (lines.length > 0 && /^ *$/.test(lines[0])) {
    lines.shift();
  }

  while (lines.length > 0 && /^ *$/.test(lines[lines.length - 1])) {
    lines.pop();
  }

  let minIndent = Infinity;

  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }

    let match = line.match(/^ */);

    if (match === null || match[0].length >= minIndent) {
      continue;
    }

    minIndent = match[0].length;
  }

  lines = lines.map(line => line.slice(minIndent));

  return lines.join('\n');
}

export default {
  '@/tutorial/hello.vx': blockTrim(`
    // Welcome to the Vortex playground!
    //
    // This playground also acts as a tutorial by describing a variety of
    // examples. Please go ahead and make edits to the code, you should see
    // the results in real-time!
    //
    // Keeping with tradition, here is the hello world program.

    return 'Hello world!';

    // When you're ready, click the next arrow ('>') above to continue.
  `),
  '@/tutorial/calculator/1.vx': blockTrim(`
    // You can use Vortex as a simple calculator:

    return 1 + 1;
  `),
  '@/tutorial/calculator/2.vx': blockTrim(`
    // +, -, *, /

    return 1 + 2 - 3 * 4 / 5;
  `),
  '@/tutorial/calculator/3.vx': blockTrim(`
    // To see the value of an expression at any point of the program, use a log
    // statement.

    log.info 1 + 1; // Creates an info-level note with 2
    log.warn 2 * 2; // Creates a warn-level note with 4
    log.error 3 ** 3; // Creates an error-level note with 27

    return 'done';
  `),
  '@/tutorial/calculator/4.vx': blockTrim(`
    // Standard order of operations applies, so these are different.

    log.info  1 + 2  * 3; //  1 + 2  * 3 -> 1 + 6 -> 7
    log.info (1 + 2) * 3; // (1 + 2) * 3 -> 3 * 3 -> 9

    return 'done';
  `),
  '@/tutorial/calculator/5.vx': blockTrim(`
    // Here is an example of every arithmetic operator.

    // Addition
    log.info 1 + 1;

    // Subtraction
    log.info 1 - 5;

    // Multiplication
    log.info 3 * 5;

    // Division
    log.info 7.0 / 2.0;
    // (Note: This is equivalent to 7 / 2 in this initial JS implementation of
    // Vortex. In future implementations, including the current Virtual
    // Machine, 7 / 2 will produce 3 due to integer division.)

    // Exponentiation
    log.info 2 ** 5; // 2 * 2 * 2 * 2 * 2 -> 32

    // Modulus
    log.info 13 % 5; // Remainder when dividing by 5


    // There are also bit-based operators, which appear less often except in
    // special circumstances.

    // Left bit shift
    log.info 1 << 2;

    // Right bit shift
    log.info 4 >> 2;

    // Bit-wise and
    log.info 6 & 3;

    // Bit-wise xor
    // Bit-wise or

    // These are just the arithmetic operators, there are others but they all
    // involve non-number values.

    return 'done';
  `),
  '@/tutorial/empty.vx': blockTrim(`
    // An empty program is invalid because it doesn't return a value. You
    // should see a red underline at the end of the input. Hover over it with
    // your mouse to see details.
  `),
  '@/tutorial/topTypes.vx': blockTrim(`
    // Every Vortex value is one of 7 top-level types:

    log.info null;           // null
    log.info true;           // boolean
    log.info 42;             // number
    log.info 'hello';        // string
    log.info [1, 2];         // array
    log.info {x: 1};         // object
    log.info func() => null; // function

    // Each of these will be covered in more detail later. Note a couple of
    // planned changes here:
    // - The initial JS implementation of Vortex running here only has one
    //   number type, because that's how JS natively works. In future there
    //   will be many number types:
    //   - u8, u16, u32, u64: Unsigned integer types
    //   - i8, i16, i32, i64: Signed integer types
    //   - f8, f16, f32, f64: Floating point types (js number == f64)
    //   Most of these are already supported in the C++ VM, and an in-browser
    //   solution for including these is planned too.
    // - Sets will be added, which are like unordered arrays.

    return 'done';
  `),
  '@/tutorial/variables/1.vx': blockTrim(`
    // Create variables with :=
    x := 0;

    // Mutate variables with =
    x = 1;

    // Increment, decrement, and compound assignment operators are also
    // available.
    x++;
    x--;
    x += 10;
    x *= 2;

    return x;
  `),
  '@/tutorial/variables/2.vx': blockTrim(`
    // It's an error to create a variable that already exists.

    x := 0;
    x := 0;

    return x;
  `),
  '@/tutorial/variables/3.vx': blockTrim(`
    // It's also an error to mutate a variable that doesn't exist.

    x = 0;

    return 'done';
  `),
  '@/tutorial/variables/4.vx': blockTrim(`
    // Mutations cannot happen inside subexpressions.

    x := 0;
    x = x++;

    return x;
  `),
  '@/tutorial/arrays/1.vx': blockTrim(`
    //

    return [1, 2, 3];
  `),
};
