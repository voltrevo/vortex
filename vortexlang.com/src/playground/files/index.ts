const demosContext = require.context(
  'raw-loader!./demos',
  true,
  /\.vx$/,
);

const utilContext = require.context(
  'raw-loader!./util',
  true,
  /\.vx$/,
);

const challengesContext = require.context(
  'raw-loader!./challenges',
  true,
  /\.vx$/,
);

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

const files = {
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

  '@/tutorial/bools/1.vx': blockTrim(`
    // Bools are like super primitive numbers with only two values:
    // - false (aka 0, 'off')
    // - true  (aka 1, 'on' )
    // (Note that bools have a dedicated type, and are actually different than
    // 0 and 1, which are numbers in Vortex.)

    log.info false;
    log.info true;

    return 'done';
  `),
  '@/tutorial/bools/2.vx': blockTrim(`
    // Like the arithmetic operators which take numbers and produce more
    // numbers, bool operators take and produce bools.

    // and
    log.info false && false;
    log.info false && true;
    log.info true && false;
    log.info true && true;

    // or
    log.info false || false;
    log.info false || true;
    log.info true || false;
    log.info true || true;

    // not
    log.info !false;
    log.info !true;

    x := true;
    y := false;
    z := true;

    log.info x && y && z;
    log.info x && !y && z;
    log.info !(x || y);

    return 'done';
  `),
  '@/tutorial/bools/3.vx': blockTrim(`
    // An operator can return a different type than its inputs. For example,
    // when comparing numbers, numbers go in and a bool comes out.

    x := 5;
    y := 10;

    return x == y; // Is x equal to y?
  `),
  '@/tutorial/bools/4.vx': blockTrim(`
    // There are 6 comparison operators.

    x := 5;
    y := 10;

    log.info x < y;
    log.info x > y;
    log.info x <= y;
    log.info x >= y;

    log.info x == y;
    log.info x != y;

    return 'done';
  `),

  '@/tutorial/empty.vx': blockTrim(`
    // An empty program is invalid because it doesn't return a value. You
    // should see a red underline at the end of the input. Hover over it with
    // your mouse to see details.
  `),
  '@/tutorial/unreachableCode.vx': blockTrim(`
    // Similarly, Vortex can detect certain forms of unreachable code, and
    // emits warnings.

    return 'done';
    log.info 'Can\\'t get here';
  `),

  '@/tutorial/controlFlow/1.vx': blockTrim(`
    // Code needs structures to decide to go one way or another. The simplest
    // way to do this is {if}.

    age := 20;

    if (age >= 18) {
      return 'Can drink in Australia';
    }

    if (age >= 21) {
      // There's actually a bug in this code - this line is unreachable.
      // Analysis is planned that can detect this and flag it as a warning.
      return 'Can drink in Australia and United States';
    }

    return 'Too young to drink, except maybe in a few places like Ethiopia';
  `),
  '@/tutorial/controlFlow/2.vx': blockTrim(`
    // Programs that might not return a value are invalid. For example, this
    // incomplete version of the previous program.

    age := 20;

    if (age >= 18) {
      return 'Can drink in Australia';
    }

    // In this example, we actually can't reach here, but only because of the
    // particular value of {age}. Programs like this might become valid in the
    // future.
  `),
  '@/tutorial/controlFlow/3.vx': blockTrim(`
    // Condition clauses only accept bools. Otherwise it's an error.

    if ('false') {
      return 'entered branch';
    }

    return 'done';
  `),
  '@/tutorial/controlFlow/4.vx': blockTrim(`
    // You can use an {else} clause to run a different piece of code when the
    // condition is false.

    msg := null;

    age := 20;

    if (age >= 18) {
      msg = 'Can drink in Australia';
    } else {
      msg = 'Can\\'t drink in Australia';
    }

    return msg;
  `),
  '@/tutorial/controlFlow/5.vx': blockTrim(`
    // If you have more than two possibilities, you can also use {else if}.

    msg := null;

    food := 'tomato';

    if (food == 'banana') {
      msg = 'A banana is a fruit';
    } else if (food == 'carrot') {
      msg = 'A carrot is a vegetable';
    } else if (food == 'tomato') {
      msg = 'A tomato is a fruit... I guess';
    } else {
      msg = 'I\\'m not sure what that one is';
    }

    return msg;
  `),
  '@/tutorial/controlFlow/6.vx': blockTrim(`
    // Often though, you might find a {switch} solution is simpler.

    food := 'tomato';

    msg := switch (food) {
      'banana' => 'A banana is a fruit';
      'carrot' => 'A carrot is a vegetable';
      'tomato' => 'A tomato is a fruit... I guess';
    };

    return msg;

    // The Vortex {switch} is quite different to the traditional
    // C-family {switch}, but it is less error prone when used for simple
    // {switch} use-cases. We might end up using a different keyword here.
  `),
  '@/tutorial/controlFlow/7.vx': blockTrim(`
    // In the previous program, if you change {food} to something unrecognized
    // by the {switch}, an error is produced. Sometimes this is what you want.
    // If you want a default, or have cases involving other variables, use this
    // form instead.

    food := 'tomato';

    msg := switch {
      (food == 'banana') => 'A banana is a fruit';
      (food == 'carrot') => 'A carrot is a vegetable';
      (food == 'tomato') => 'A tomato is a fruit... I guess';

      true => 'I\\'m not sure what that one is';
    };

    return msg;

    // Although it isn\'t necessary for this form of switch, adding the
    // keyword {default} to specify default cases for both forms will probably
    // be added in the future.
  `),
  '@/tutorial/controlFlow/8.vx': blockTrim(`
    // Vortex takes a page out of golang's book and uses the {for} keyword for
    // every form of loop. The simplest form is just like {if}, except the code
    // is repeated as long as the condition is true, instead of only going
    // once.

    sum := 0;

    i := 1;

    for (i <= 4) {
      sum += i;

      log.info i;
      log.info sum;

      i++;
    }

    return sum;
  `),
  '@/tutorial/controlFlow/9.vx': blockTrim(`
    // This form of loop is very common:
    // 1. Create a variable with a starting value.
    // 2. Continue the loop as long as the variable is in range.
    // 3. Move the variable to the next value after each round.
    //
    // Because of that, there is a dedicated syntax for it.

    sum := 0;

    for (      i := 1    ;         i <= 4          ;      i++       ) {
      //  1. Start i at 1; 2. Continue while i <= 4; 3. Increment i

      sum += i;

      log.info i;
      log.info sum;
    }

    return sum;
  `),
  '@/tutorial/controlFlow/10.vx': blockTrim(`
    // If you want the loop to keep going unconditionally, simply omit the
    // parentheses altogether.

    sum := 0;
    i := 1;

    for {
      sum += i;
      i++;

      log.info i;
      log.info sum;

      if (sum > 8) {
        return sum;
      }
    }

    // Vortex knows we can't reach here because of the unconditional loop, so
    // it doesn't emit an error for failing to return.
  `),
  '@/tutorial/controlFlow/11.vx': blockTrim(`
    // To break out of the loop without returning, use {break}.


    sum := 0;
    i := 1;

    for {
      sum += i;
      i++;

      log.info i;
      log.info sum;

      if (sum > 8) {
        break;
      }
    }

    sum += i * i;

    return sum;
  `),
  '@/tutorial/controlFlow/12.vx': blockTrim(`
    // To skip the rest of the current iteration but continue looping, use
    // {continue}.

    sum := 0;
    i := 1;

    for {
      sum += i;
      i++;

      if (i == 2) {
        continue;
      }

      log.info i;
      log.info sum;

      if (sum > 8) {
        break;
      }
    }

    sum += i * i;

    return sum;
  `),
  '@/tutorial/controlFlow/13.vx': blockTrim(`
    // Arrays are covered in more detail later, but there's one more type of
    // loop which depends on them. It allows the loop variable to take a
    // specific sequence of values.

    sum := 0;

    for (i of [1, 2, 3, 4]) {
      sum += i;
    }

    return sum;
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
    log.info [
      'foo':Length(),
      ['f', 'o', 'o']:Length(),
    ];

    // Both can be concatenated with ++.
    log.info [
      'foo' ++ 'bar',
      ['f', 'o', 'o'] ++ ['b', 'a', 'r'],
    ];

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

    // Arrays also have several extra methods not shared by objects, these will
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
    // 'number: {1 + 1}' // (Or something like that)
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
  '@/tutorial/objects/9.vx': blockTrim(`
    // You can also lookup object keys dynamically with the subscript operator.

    car := {
      wheels: {
        material: 'rubber',
      },
    };

    component := 'whe' ++ 'els';

    return car[component].material;
  `),
  '@/tutorial/objects/10.vx': blockTrim(`
    // Objects have a convenient shorthand syntax where {name} is the same
    // as {name: name}. This is especially handy for logging.

    x := 3;
    y := 5;

    log.info {x, y};

    return x + y;
  `),

  '@/tutorial/functions/1.vx': blockTrim(`
    // A function is a way to repeat the same code with different starting
    // conditions.

    func doublePlus1(x) {
      return 2 * x + 1;
    };

    return [
      doublePlus1(10),
      doublePlus1(100),
    ];
  `),
  '@/tutorial/functions/2.vx': blockTrim(`
    // If a function only needs a single expression, you can use this more
    // concise format.

    func doublePlus1(x) => 2 * x + 1;



    return [
      doublePlus1(10),
      doublePlus1(100),
    ];
  `),
  '@/tutorial/functions/3.vx': blockTrim(`
    // Feel free to use input variables like normal. It has no effect outside
    // the function.

    func doublePlus1(x) {
      x *= 2;
      x += 1;

      return x;
    };

    results := [];

    x := 10;
    results ++= [doublePlus1(x)];
    log.info x;

    x = 100;
    results ++= [doublePlus1(x)];
    log.info x;

    return results;
  `),
  '@/tutorial/functions/4.vx': blockTrim(`
    // Functions are also simply values. You can use them like any other value,
    // like assign them to variables.


    f := func doublePlus1(x) => 2 * x + 1;

    return [f(10), f(100)];
  `),
  '@/tutorial/functions/5.vx': blockTrim(`
    // Note that the previous program generated a warning about {doublePlus1}
    // being unused. Generally, if you assign a function to a variable, you
    // should not give the function a name.

    f := func(x) => 2 * x + 1;

    return [f(10), f(100)];
  `),
  '@/tutorial/functions/6.vx': blockTrim(`
    // A function can return another function.

    func Adder(x) => func(y) => x + y;

    add3 := Adder(3);
    add5 := Adder(5);

    return [add3(10), add5(100), Adder(8)(1000)];
  `),
  '@/tutorial/functions/7.vx': blockTrim(`
    // You can even pass in functions as parameters.

    func doubleTransform(value, transform1, transform2) {
      value = transform1(value);
      value = transform2(value);

      return value;
    };

    return doubleTransform(
      100,
      func(x) => x * 2,
      func(x) => x + 7,
    );
  `),

  '@/tutorial/scope/1.vx': blockTrim(`
    // The parts of the code where a variable is available for use is called
    // its scope.
    //
    // Regular variables exist from the point of creation until
    // the end of the applicable block.
    //
    // Here's an example of using a variable too early.

    log.info x;

    x := 3;

    return x;
  `),
  '@/tutorial/scope/2.vx': blockTrim(`
    // And here's an example of using a variable too late.

    if (true) {
      x := 3;
      // x goes out of scope here. Because it wasn't used, we also get an
      // unused warning.
    }

    return x;
  `),
  '@/tutorial/scope/3.vx': blockTrim(`
    // This is ok though.

    x := 0;

    if (true) {
      x = 3; // Ok: x is still in scope.
    }

    return x;
    // x goes out of scope here.
  `),
  '@/tutorial/scope/4.vx': blockTrim(`
    // The loop variables of for loops exist from creation until the end of the
    // loop.

    sum := 0;

    for (i := 1; i <= 4; i++) {
      sum += i;
    }

    return i;
  `),
  '@/tutorial/scope/5.vx': blockTrim(`
    // Some languages allow you to re-use names for new variables inside blocks
    // that would otherwise still be in scope. This is called shadowing.
    //
    // In Vortex, shadowing is not allowed. Here are a couple of examples.

    x := 1;

    if (true) {
      log.info x; // 1 in C/C++, TDZ error in JS.
      x := 2;
      log.info x;
    }

    log.info x; // This would log 0 if shadowing was allowed.

    func foo(x) => 10 * x;

    return foo(x); // 10, if shadowing was allowed.
  `),
  '@/tutorial/scope/6.vx': blockTrim(`
    // When a function is defined in a statement, it is hoisted to the top of
    // the current block (the file as a whole is also a block).

    x := doublePlus1(10);

    func doublePlus1(y) => 2 * y + 1;

    return x;
  `),
  '@/tutorial/scope/7.vx': blockTrim(`
    // However, when a function is a subexpression, it is not hoisted, and its
    // name only exists inside that function.

    x := doublePlus1(10);

    f := func doublePlus1(y) => 2 * y + 1;

    y := doublePlus1(100);

    return [f, x, y];
  `),
  '@/tutorial/scope/8.vx': blockTrim(`
    // Usually giving a function a name in a subexpression doesn't make sense.
    // But it can be used for recursion.

    return func factorial(n) => switch {
      (n > 0) => n * factorial(n - 1);
      true => 1;
    };
  `),
  '@/tutorial/scope/9.vx': blockTrim(`
    // Many programs can be written without hoisting. For this reason, you
    // might be tempted to avoid it and always assign to a variable instead.
    // However, hoisting is necessary for mutual recursion. Therefore, if you
    // want to prefer one format over another when both will work for you,
    // prefer hoisting.
    //
    // Here's an example of mutual recursion.

    func foo(x, depth) {
      if (x == 0) {
        return ['stopping at 0', {depth}];
      }

      return bar((x + 5) % 13, depth + 1); // Ok: bar is hoisted
    };

    func bar(x, depth) {
      if (x == 1) {
        return ['stopping at 1', {depth}];
      }

      return foo((x + 5) % 13, depth + 1);
    };

    return foo(7, 0);

    // (It's also possible to avoid hoisting by continuously passing the
    // necessary functions through as parameters. However, those programs are
    // much more difficult to read and write.)
  `),

  '@/tutorial/closures/1.vx': blockTrim(`
    // According to the rules of scoping, when inside a function there can be
    // variables available that were defined outside the function. If you've
    // never encountered this before, it can be surprising that it works.

    x := 10;

    func twiceXPlus1() => 2 * x + 1;

    return twiceXPlus1();
  `),
  '@/tutorial/closures/2.vx': blockTrim(`
    // This is called a closure. When a function captures variables into its
    // closure, it is not available until after those variables have been
    // created.

    y := twiceXPlus1();

    x := 10;

    func twiceXPlus1() => 2 * x + 1;

    return y;
  `),
  '@/tutorial/closures/3.vx': blockTrim(`
    // The simplest way to implement closures would be to simply allow
    // functions to passively read from the surrounding scope. However, if we
    // did that, we'd have to limit the scope of functions based on their
    // captures.

    f := null;

    if (true) {
      msg := 'Hello';
      f = func() => msg;
    }

    msg := 'world';

    // {f} implicitly stores the {msg} it saw when it was created.
    return f();
  `),
  '@/tutorial/closures/4.vx': blockTrim(`
    // In other languages, closures are sometimes used to create an external
    // state that influences the function's behavior over time.
    //
    // In Vortex, this is prevented by disallowing the capture of variables
    // that are mutated.

    i := 0;

    func counter() {
      i++;
      return i;
    };

    log.info counter(); // 1?
    log.info counter(); // 2?
    log.info counter(); // 3?

    i = 0;
    log.info counter(); // Back to 1?

    return 'done';
  `),
  '@/tutorial/closures/5.vx': blockTrim(`
    // For some programming patterns, this ability to have shared state
    // manipulation is convenient. However, it can also make programming
    // profoundly more complicated.

    func workSlow(task1, task2) => [
      task1(),
      task2(),
      task1(),
    ];

    func workFast(task1, task2) {
      output1 := task1(); // Only do task1 once!
      output2 := task2();

      return [output1, output2, output1];
    };

    // In Vortex, you can safely simplify workSlow into workFast. In fact,
    // future versions of the compiler will do this kind of optimization for
    // you.

    func test(work) {
      a := 1;
      b := 2;
      c := 3;
      d := 4;

      func addThings() => a + b;
      func multiplyThings() => c * d;

      return work(addThings, multiplyThings);
    };

    return [
      test(workSlow),
      test(workFast),
    ];
  `),
  '@/tutorial/closures/6.vx': blockTrim(`
    // However, if mutating closure variables was allowed, this could go
    // wrong.


    func workSlow(task1, task2) => [
      task1(),
      task2(),
      task1(),
    ];

    func workFast(task1, task2) {
      output1 := task1(); // Only do task1 once!
      output2 := task2();

      return [output1, output2, output1];
    };





    func test(work) {
      a := 1;
      b := 2;
      c := 3;
      d := 4;

      func addThings() => a + b;

      func multiplyThings() {
        a = 100; // ¯\\_(ツ)_/¯ - most languages
        return c * d;
      };

      return work(addThings, multiplyThings);
    };

    return [
      test(workSlow), // Would be: [3, 12, 102]
      test(workFast), // Would be: [3, 12, 3]
    ];

    // In Vortex, you should always get the same output when calling the same
    // function with the same arguments. If you can find an example that
    // doesn't do this, please file a bug report at:
    // https://github.com/voltrevo/vortex/issues
  `),

  '@/tutorial/valueSemantics/1.vx': blockTrim(`
    // Vortex always uses value semantics. This means that changes to data
    // structures are not shared between multiple variables.
    //
    // Many other languages allow reference semantics, which is another way
    // functions can change their behavior.

    x := [5, 6, 7];

    func checkX() {
      if (x != [5, 6, 7]) {
        return 'Something happened to x!';
      }

      return 'Ok';
    };

    log.info checkX();

    y := x;

    // With reference semantics, x and y merely *reference* an array that
    // currently contains [5, 6, 7]. When we update 6 -> 60 in y, that change
    // is reflected in x. In Vortex, x and y *are* [5, 6, 7], and this update
    // is only reflected in y.
    y[1] *= 10;

    log.info checkX();

    return {x, y};
  `),
  '@/tutorial/valueSemantics/2.vx': blockTrim(`
    // Another consequence of value semantics is that data structures are
    // compared according to their actual content.

    x := [1, 2, 3];
    y := [1, 2, 3];

    return x == y; // In JS, this is false.
  `),

  '@/tutorial/destructuring/1.vx': blockTrim(`
    // Destructuring is a feature which simplifies getting the contents of
    // data structures.

    data := [1, 2, 3];

    [a, b, c] := data;

    return a + b * c;
  `),
  '@/tutorial/destructuring/2.vx': blockTrim(`
    // Destructuring allows you to name the arguments to your functions, so
    // that the order doesn't matter.

    func foo({a, b, c}) => a + b * c;

    return foo({
      c: 3,
      b: 2,
      a: 1,
    });
  `),
  '@/tutorial/destructuring/3.vx': blockTrim(`
    // It can also be used to simplify other patterns, like swapping two
    // values.

    a := 'foo';
    b := 'bar';

    log.info a ++ b;

    [a, b] = [b, a];

    log.info a ++ b;

    return 'done';
  `),
  '@/tutorial/destructuring/4.vx': blockTrim(`
    // Objects (and arrays) have an :Entries() method, which is generally
    // expected to be combined with destructuring.

    data := {
      a: 1,
      b: 2,
      c: 3,
    };

    for ([key, value] of data:Entries()) {
      log.info {key, value};
    }

    return 'done';
  `),

  '@/tutorial/vectorOperations/1.vx': blockTrim(`
    // The reason why strings use ++ for concatenation, is to be consistent
    // with arrays using ++ for concatenation. + is reserved instead for
    // vector addition.

    return [10, 20] + [3, 4];
  `),
  '@/tutorial/vectorOperations/2.vx': blockTrim(`
    // You can also multiply and divide by scalars.

    return 10 * [5, 6] + ([7, 7] / 7);
  `),
  '@/tutorial/vectorOperations/3.vx': blockTrim(`
    // Matrices work too, they're just nested arrays.

    x := [
      [1, 2],
      [3, 4],
    ];

    log.info x * x;

    identity := [
      [1, 0],
      [0, 1],
    ];

    log.info (x + identity) * (x + identity);
    log.info x * x + 2 * x + identity;

    return 'done';
  `),
  '@/tutorial/vectorOperations/4.vx': blockTrim(`
    // For a practical example of matrix multiplication, consider a program
    // that implements poker. You might represent the chips owned by each
    // player using a matrix.

    holdings := [
      [1,  3, 20], // 1 blue chip(s),  3 green chip(s), 20 white chip(s)
      [0, 20,  5], // 0 blue chip(s), 20 green chip(s),  5 white chip(s)
    ];

    // Then you could represent how much each type of chip is worth, in
    // equivalent white chips, using another matrix.

    chipValues := [
      [100], // blue  chips are worth 100 white chip(s)
      [ 20], // green chips are worth  20 white chip(s)
      [  1], // white chips are worth   1 white chip(s)
    ];

    // That way, multiplying them together would tell you how much each player
    // has in equivalent white chips.

    return holdings * chipValues;
  `),
  '@/tutorial/vectorOperations/5.vx': blockTrim(`
    // In Vortex, you can also represent matrices with objects. This makes the
    // poker logic easier to understand.


    holdings := {
      player1: {blue: 1, green:  3, white: 20},
      player2: {blue: 0, green: 20, white:  5},
    };

    chipValues := {
      blue:  {white: 100},
      green: {white:  20},
      white: {white:   1},
    };

    return holdings * chipValues;
  `),
  '@/tutorial/vectorOperations/6.vx': blockTrim(`
    // You might wonder whether [1, 2, 3] is a column vector or a row vector.
    // It's actually neither. [1, 2, 3] only has 1 dimension - 3. Column
    // vectors and row vectors are special cases of matrices, and matrices have
    // 2 dimensions. In this case we need 3x1 for a column vector and 1x3 for a
    // row vector.

    v := [1, 2, 3];

    column := [
      [1],
      [2],
      [3],
    ];

    row := [
      [1, 2, 3],
    ];

    log.info row * column;
    log.info 1 * 1 + 2 * 2 + 3 * 3;

    // Arrays provide :Column() and :Row() methods to help here.

    log.info v:Row() * v:Column();

    // You can turn a row vector into a column vector with :Transpose(), and
    // vice versa.

    log.info v:Row():Transpose();
    log.info v:Column():Transpose();

    return 'done';
  `),
  '@/tutorial/vectorOperations/7.vx': blockTrim(`
    // Transpose also works on matrices.

    matrix := [
      [1, 2, 3],
      [4, 5, 6],
    ];

    return {
      regular: matrix,
      transposed: matrix:Transpose(),
    };
  `),
  '@/tutorial/vectorOperations/8.vx': blockTrim(`
    // Sometimes transpose can come in handy outside of linear algebra. If
    // you have a pair of arrays, and want an array of pairs, you can use
    // :Transpose() for that.

    teams := ['Lions', 'Tigers', 'Bears'];
    points := [5, 6, 7];

    log.info {
      regular: [teams, points],
      transposed: [teams, points]:Transpose(),
    };

    for ([t, p] of [teams, points]:Transpose()) {
      log.info 'The ' ++ t ++ ' have ' ++ p:String() ++ ' points.';
      // Planned enhancement:
      // log.info 'The {t} have {p} points';
    }

    return 'done';
  `),

  '@/tutorial/mapReduce/1.vx': blockTrim(`
    // Arrays have a couple of extra very important methods - the fabled
    // :map and :reduce.
    //
    // :map creates a new array by calling a function on each element.

    return ([1, 2, 3]
      :map(func(x) => x * x)
    );
  `),
  '@/tutorial/mapReduce/2.vx': blockTrim(`
    // :reduce reduces many values into one by repeatedly calling a function
    // which takes two values and produces one.



    return ([1, 2, 3]
      :reduce(func(x, y) => x + y)
    );
  `),
  '@/tutorial/mapReduce/3.vx': blockTrim(`
    // :map and :reduce are frequently chained together.




    return ([1, 2, 3]
      :map(func(x) => x * x)
      :reduce(func(x, y) => x + y)
    );
  `),
  '@/tutorial/mapReduce/4.vx': blockTrim(`
    // For convenience, operators can be interpreted as function values in
    // appropriate contexts lacking arguments.



    return ([1, 2, 3]
      :map(func(x) => x * x)
      :reduce(+)
    );

    // In contexts where this doesn't work, you can always use parentheses
    // instead.
    // return (+)(1, 2);
  `),

  '@/tutorial/imports/1.vx': blockTrim(`
    // Imports allow you to build larger programs by splitting them up into
    // files.

    import ./messages.vx;

    return messages.hello;
  `),
  '@/tutorial/imports/2.vx': blockTrim(`
    // Imports are often at the top of a file, but they can also go anywhere.
    // They can even be embedded inside expressions.

    return (import ./messages.vx).numbers;
  `),
  '@/tutorial/imports/3.vx': blockTrim(`
    // Imports have an alternative syntax when the filename is not a valid
    // identifier, or you need to use an alternative name to avoid a collision.

    import example2 from './2.vx';

    return example2;
  `),
  '@/tutorial/imports/newFolder/4.vx': blockTrim(`
    // You can't use .. to access parent directories.


    import example2 from '../2.vx';

    return example2;
  `),
  '@/tutorial/imports/newFolder/5.vx': blockTrim(`
    // But you can use @ instead of . to start at the root of the project
    // and access any file.

    import example2 from '@/tutorial/imports/2.vx';

    return example2;
  `),
  '@/tutorial/imports/6.vx': blockTrim(`
    // If you have a circular import, Vortex will emit an error instead of
    // spinning in a loop.

    import six from './6.vx';

    return six;
  `),
  '@/tutorial/imports/7.vx': blockTrim(`
    // It detects import problems across multiple files too.

    import eight from './8.vx';

    return eight;
  `),
  '@/tutorial/imports/8.vx': blockTrim(`
    // It detects import problems across multiple files too.

    import nine from './9.vx';

    return nine;
  `),
  '@/tutorial/imports/9.vx': blockTrim(`
    // It detects import problems across multiple files too.

    import eight from './8.vx';

    return eight;
  `),
  '@/tutorial/imports/10.vx': blockTrim(`
    // Having said that, some circular imports are actually ok.

    import util from './10.vx';

    return {
      Min: func(a, b) => util.MinMax(a, b)[0],
      Max: func(a, b) => util.MinMax(a, b)[1],

      MinMax: func(a, b) => switch {
        (a < b) => [a, b];
        true => [b, a];
      },
    };
  `),
  '@/tutorial/imports/11.vx': blockTrim(`
    // An import statement is a declaration that is only resolved when it is
    // actually used. Circular imports are ok as long as they don't create an
    // evaluation loop.

    import util from './10.vx';

    return util.Max(15, 20);
  `),
  '@/tutorial/imports/messages.vx': blockTrim(`
    return {
      hello: 'Hi there',
      numbers: [1, 2, 3, 4],
    };
  `),
};

const contexts = [
  ['demos', demosContext],
  ['util', utilContext],
  ['challenges', challengesContext],
] as [string, any][];

for (const [dir, ctx] of contexts) {
  for (const f of ctx.keys()) {
    files[f.replace('./', `@/${dir}/`)] = ctx(f);
  }
}

export default files;
