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

    // Although it isn\\'t necessary for this form of switch, adding the
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
};
