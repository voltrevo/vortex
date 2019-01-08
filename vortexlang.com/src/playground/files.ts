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

    // Bit-wise or
    log.info 6 | 3;

    // Bit-wise xor
    log.info 6 ^ 3;

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
    log.info true;           // bool
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
    x = (x = 1);

    return x;
  `),
  '@/tutorial/variables/5.vx': blockTrim(`
    x := 10;

    // If you have an expression like this:
    x = x + 3;

    // You can simplify it with a compound assignment operator:
    x += 3;

    return x;
  `),

  '@/tutorial/arrays/1.vx': blockTrim(`
    // Group values together with arrays.

    return [
      1 * 1,
      2 * 2,
      3 * 3,
    ];
  `),
  '@/tutorial/arrays/2.vx': blockTrim(`
    // Arrays can contain any Vortex value, including other arrays.

    return [
      1 ** 2,
      [2 ** 2],
      [3 ** 2, 'nine'],
    ];
  `),
  '@/tutorial/arrays/3.vx': blockTrim(`
    // Add extra values using the concatenation operator.

    x := [1, 2, 3];

    return x ++ [4];
  `),
  '@/tutorial/arrays/4.vx': blockTrim(`
    // As before, there is also a compound operator for concatenation.

    x := [1, 2, 3];
    x ++= [4];

    return x;
  `),
  '@/tutorial/arrays/5.vx': blockTrim(`
    // Access an element of an array with the subscript operator [].

    x := [5, 6, 7];

    log.info x[0]; // Note that subscripts begin at 0.
    log.info x[1];
    log.info x[2];

    return 'done';
  `),
  '@/tutorial/arrays/6.vx': blockTrim(`
    // You can also modify elements this way.

    x := [5, 6, 7];

    x[1] *= 10;

    return x;
  `),
  '@/tutorial/arrays/7.vx': blockTrim(`
    // In many languages, such as JavaScript, arrays can be affected by changes
    // made via other variables. In Vortex this does not happen. More on this
    // later.

    x := [5, 6, 7];
    y := x;

    log.info x;
    log.info y;

    x[1] *= 10;

    log.info x; // x has changed
    log.info y; // y has not

    return 'done';
  `),
  '@/tutorial/arrays/8.vx': blockTrim(`
    // To get the length of an array, use :Length().

    x := [5, 6, 7, 8, 9, 10];

    return x:Length();
  `),

  '@/tutorial/strings/1.vx': blockTrim(`
    // There is a dedicated string type.

    x := 'hello';

    return x;
  `),
  '@/tutorial/strings/2.vx': blockTrim(`
    // Strings are similar to arrays, but have important differences.

    // Both are sequences with a :Length() method.
    log.info ['foo':Length(), ['f', 'o', 'o']:Length()];

    // Both can be concatenated with ++.
    log.info ['foo' ++ 'bar', ['f', 'o', 'o'] ++ ['b', 'a', 'r']];

    // Arrays can contain anything, strings only contain unicode characters.
    log.info [1, [2], 'three'];
    log.info '1[2]three';

    // String subscripts return strings of length 1, rather than the
    // underlying character representation.
    str := 'foo';
    str = str[0];
    str = str[0];
    str = str[0];
    log.info str;

    // Strings have a simpler representation than arrays.
    log.info 'foo';           //  5 characters
    log.info ['f', 'o', 'o']; // 15 characters

    // Arrays also have several extra methods not shared by arrays, these will
    // be covered later.

    return 'done';
  `),
  '@/tutorial/strings/3.vx': blockTrim(`
    // Every functionless Vortex value has a string representation.

    return [
      ['null:   ' ++ null:String()],
      ['number: ' ++ (1 + 1):String()],
      ['string: ' ++ 'foo':String()],
      ['array:  ' ++ [1, 2, 3]:String()],
    ];

    // String interpolation is planned, which will enable expressions like:
    // 'number: ' ++ (1 + 1):String()
    // to be simplified to:
    // 'number: {123}' // (Or something like that)
  `),

  '@/tutorial/objects/1.vx': blockTrim(`
    // Arrays allowed you to combine values in sequences, objects allow you to
    // combine values by naming them instead.

    x := {foo: 3, bar: 5};

    return x.foo * x.bar;

    // ...objects might be renamed to maps...
  `),
  '@/tutorial/objects/2.vx': blockTrim(`
    // Unlike JavaScript, object keys are truly unordered. The order they
    // appear is ignored and they are stored alphabetically instead.

    return [
      {foo: 3, bar: 5},
      {bar: 5, foo: 3},
    ];
  `),
  '@/tutorial/objects/3.vx': blockTrim(`
    // Objects can be concatenated too.

    return {foo: 3} ++ {bar: 5};
  `),
  '@/tutorial/objects/4.vx': blockTrim(`
    // You can start with an empty object and add things to it.

    x := {};

    x.foo := 0;
    x.foo = 1;
    x.foo++;
    x.foo += 1;

    x ++= {bar: 5};

    return x;
  `),
  '@/tutorial/objects/5.vx': blockTrim(`
    // Use :Keys() to get the keys of an object.

    return {foo: 3, bar: 5}:Keys();
  `),
  '@/tutorial/objects/6.vx': blockTrim(`
    // And use :Values() to get the values.

    return {foo: 3, bar: 5}:Values();

    // Note that the order of the values corresponds to the alphabetical key
    // ordering.
  `),
  '@/tutorial/objects/7.vx': blockTrim(`
    // Objects can contain other objects, and any value for that matter.

    car := {
      wheels: {
        material: 'rubber',
      },
    };

    return car.wheels.material;
  `),
  '@/tutorial/objects/8.vx': blockTrim(`
    // You can update nested values too. Like before, this does not affect any
    // other variables when you do this.

    car := {
      wheels: {
        material: 'rubber',
      },
    };

    toyCar := car;
    toyCar.wheels.material = 'plastic';

    return [
      ['The car wheels are made of ' ++ car.wheels.material],
      ['The toy car wheels are made of ' ++ toyCar.wheels.material],
    ];
  `),
};
