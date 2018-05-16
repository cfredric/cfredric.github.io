---
layout: post
title: The Nature of Promises (Haskell version)
---

This post is a followup to [the previous post]({{ site.baseurl }}{% post_url 2017-12-29-Promises %}), which tried to illustrate that JavaScript Promises are an instance of a common interface that comes up in programming, called "monads". In this post, I want to introduce some basic Haskell, talk a bit more about what it means to be a monad[^trap], and show some of the ideas that were briefly mentioned in the last post.

A note on the code snippets in this post: most of the Haskell code snippets here are regular Haskell code that could be found in a source file. Some snippets have lines that begin with `>`; these snippets are transcripts from a [GHCi](http://downloads.haskell.org/~ghc/latest/docs/html/users_guide/ghci.html) session. GHCi is a Haskell interpreter, and is extremely useful for debugging and exploring Haskell code. One of the tricks used in this post is `:t <expression>`, which asks GHCi what the type of `<expression>` is.

# Haskell
First thing's first: let's talk about Haskell. Haskell is a statically typed, immutable, lazily evaluated, pure, functional programming language. Let's briefly talk about each of these adjectives and what they mean for a programming language. (More detailed intros to Haskell are a quick search away; the one I started with is [Learn You A Haskell for Great Good](http://learnyouahaskell.com/).)

#### Statically Typed
Saying a language is statically typed means that the type of every expression can be determined at compile-time, as opposed to at runtime. In other words, the source code itself contains enough information and semantics to determine these types. This is in contrast to dynamically typed languages like JavaScript or Python, where the following is allowed:

{% highlight python %}

if random.choice([True, False]):
    x = 5
else:
    x = "hello"
{% endhighlight %}

In such languages, there's no way to know the type of `x` until the code is executed, because the type is allowed to change.

#### Immutable
In Haskell, there are no such things as variables. Values can be named, and names can come in and out of scope, but the value associated with a name can never be modified. Haskell's opinion is that statements like `a = 3; a = 4;` make no sense from a mathematical point of view: it can't be true that something is both 3 and 4! This has a few important implications on the language itself. (For example, there's no such thing as a `for` loop, since that depends on modifying a loop variable. There's no `while` loop either, for similar reasons. Instead, all looping is done via recursion.) This lack of variables can be a bit brain-bending at first, especially for people coming from an imperative programming background, but it makes code easier to reason about, since there are no moving parts. We'll see how this works as we go on.

#### Pure
To say a language is "pure" is to say that its functions may only have an effect on the world by returning values. In other words, pure functions are not allowed to access or modify any kind of external state. A function that takes an integer and returns an integer (which would have the type signature `foo :: Int -> Int` in Haskell) isn't allowed to send a network request (for example), since that would be a side effect[^io]. This is very restricting, but it's also very powerful, since it means you can infer a lot about a function, just by looking at its type signature.

#### Functional
The full definition of a functional programming language is debatable, but a core requirement is the ability to create and return new functions at runtime, and pass them around as arguments to other functions. We do this all the time in other languages - for example when using functions as callbacks or using `Array.prototype.map` in JavaScript. Haskell takes this to the extreme end of the spectrum, and does some things to make this style as easy as possible (e.g. automatic [currying](https://en.wikipedia.org/wiki/Currying) of functions; not requiring parentheses for function application; allowing [partial application](https://en.wikipedia.org/wiki/Partial_application), etc.)

#### Lazily Evaluated
Since Haskell's values are immutable, and no function can have side effects, it doesn't really matter when any given Haskell expression is evaluated - as long as it's evaluated when it's needed. This is in contrast to a language like Java, where the order of evaluation of expressions matters. For example, in Java:

{% highlight java %}
public class Test {
    private int x = 0;
    void foo() {
       printInts(increment(), x);
    }

    private int increment() {
        return ++x;
    }

    void printInts(int a, int b) {
        System.out.println(a + ", " + b);
    }
}
{% endhighlight %}

In this small snippet, evaluation order matters: different evaluation orders lead to different runtime behavior. In the call to `printInts`, there are two arguments. If the left is evaluated first, then "1, 1" will be printed. If the right is evaluated first, then "1, 0" will be printed. (If you're curious, [Java evaluates arguments from left to right](https://docs.oracle.com/javase/specs/jls/se7/html/jls-15.html#jls-15.7).) Most languages, like Java, C, Python, JavaScript, C#, etc., must be careful about the order in which expressions are evaluated; these languages use a [strictly defined evaluation order](https://en.wikipedia.org/wiki/Eager_evaluation), in order to ensure consistent behavior. In Haskell, this kind of situation cannot arise, since values are immutable, and global state is very carefully tracked. So Haskell is allowed to evaluate expressions in any order it likes - and even further than that, it's able to *avoid* evaluating an expression if the actual value is never needed. This can be such a strange concept that it deserves a very explicit example:

{% highlight haskell %}
> let list = [1, div 2 0, -1]
{% endhighlight %}

This line defines a list with three elements. But if we look carefully at the list's definition, we see that the second element is `div 2 0`. `div` is Haskell's integer division function, so this expression will throw a "division by zero" exception when it is evaluated. However, since Haskell is lazy, it won't evaluate the expression until we actually ask it to. This means that we can get the first element of the list, since that doesn't have anything to do with the second element:

{% highlight haskell %}
> list !! 0
1
{% endhighlight %}

Similarly, we can look at the third element:

{% highlight haskell %}
> list !! 2
-1
{% endhighlight %}

We can even bind a name to the problematic element, without evaluating it:

{% highlight haskell %}
> let boom = list !! 1
{% endhighlight %}

It's not until we ask Haskell what the value actually *is* that it's forced to evaluate it, and throws the exception:

{% highlight haskell %}
> boom
*** Exception: divide by zero

{% endhighlight %}

This laziness enables some cool things, like the ability to define infinite data structures. For example, a list that contains all the positive integers:

{% highlight haskell %}
> let integers = [1..]
> take 50 integers
[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]
> length integers -- Haskell tries to find the end of the list here, which is impossible, so my computer just hangs as it evaluates larger and larger elements of the list.
^C
{% endhighlight %}

It also enables values to be defined in terms of themselves. A classic example is this definition of the entire Fibonacci sequence (figuring out how this works is an exercise for the reader):

{% highlight haskell %}
> let fibonacciNums = 1 : 1 : zipWith (+) fibonacciNums (tail fibonacciNums)
> take 10 fibonacciNums
[1,1,2,3,5,8,13,21,34,55]
{% endhighlight %}

This laziness is pretty cool[^laziness] if you ask me, and very useful.[^other_laziness]


# Back to Monads

Now that you know roughly what Haskell is, let's talk about monads again. In the previous post, we eventually saw that `bind` and `unit` were the workhorses of the monad interface. In Haskell, these functions are called `>>=` (which is an infix operator) and `return`, respectively, so I'll use those names from now on. We previously tried to describe the monad interface using a made-up, pseudo-JavaScript syntax. Haskell can actually talk about monads, so how does it describe their interface?

{% highlight haskell %}
class Applicative m => Monad m where
    (>>=) :: m a -> (a -> m b) -> m b
    return :: a -> m a
{% endhighlight %}

Let's go through this line by line.

`class Applicative m => Monad m where` defines a typeclass called `Monad`. A typeclass is essentially an interface that can be implemented (to borrow some terminology from OOP languages) by some concrete type. One thing to note is that instead of saying that `m` "implements" a particular interface, in Haskell we say that `m` is an "instance" of that particular typeclass. So this line says, "a type `m` is an instance of the `Monad` typeclass if it is also an instance of the `Applicative` typeclass, and implements the following functions:", and the following lines describe the functions that make up the interface.

`(>>=) :: m a -> (a -> m b) -> m b` is a type signature for an operator called `>>=`. (Operators are just functions that take 2 arguments, and the arguments go on either side of the operator. We can tell this is an operator because it is spelled with only punctuation, no letters.) The type signature says that the left operand to the operator has to be of type `m a`; the right operand has to be a function of type `a -> m b`; and the return type of the operator is of type `m b`. Note that in this signature, `a` and `b` are names for arbitrary types, but `m` refers to the thing that is an instance of `Monad`.

`return :: a -> m a` is a type signature for a function called `return`. The signature says that the input parameter must be of type `a`, and the return type is of type `m a` (where `a` is a name for some arbitrary type, and `m` is the type that is an instance of `Monad`).

Just to see how this works in practice, let's define our own monad. We'll make a monad that automatically checks if things are "null" and bails out of the computation if they are. (This already exists in Haskell as the [`Maybe`](http://hackage.haskell.org/package/base-4.11.1.0/docs/Prelude.html#t:Maybe) monad, but it'll be instructive to define it ourselves, so we can see how it works.)

# The Optional datatype

The first thing we need to do is define a datatype that "wraps" values that might be null. Haskell doesn't have the concept of null, so we'll create one ourselves. We can call it whatever we want, but we'll call it `Null` for familiarity. (The real `Maybe` type calls this value `Nothing`.) If something is non-null, we'll call it a `NonNull` value. Our datatype can now be defined as follows:

{% highlight haskell %}
data Optional a = Null | NonNull a
    deriving (Show)
{% endhighlight %}

The first line says that `Optional a` is a new datatype (`data Optional a`), and describes what values of that type look like. Values can either be `Null`, or they can be `NonNull` and have a "payload" (`a`), which is whatever we're wrapping. Let's see a couple values that have been wrapped in `Optional`, and see what their types are:

{% highlight haskell %}
> :t Null
Null :: Optional a
> :t NonNull "hello world"
NonNull "hello world" :: Optional [Char]
> :t NonNull 'c'
NonNull 'c' :: Optional Char
{% endhighlight %}

We first ask what the type of `Null` is. Since `Null` could be used in place of anything that was wrapped in `Optional`, Haskell tells us the type is `Optional a`. Here, `a` is a type variable; it stands for "any type" in this case. (This is similar to the `T` in Java's `ArrayList<T>`, or other generic classes.) Next, we wrap a `String`, and Haskell tells us the type is `Optional [Char]`. (Haskell's strings are implemented as lists of characters, so this type makes sense to us.) Finally, we try wrapping a character, and we're told the type is `Optional Char`, as we expect.

So far, we can't do much with this type. Every time we use an `Optional` value, we're forced to inspect it manually, to determine whether or not it's `Null`. If we borrowed the `getFooAndBar` example from the previous post as a motivating example[^caveats], it would look something like this:

{% highlight haskell %}
getFooAndBar :: Param -> Optional (Foo, Bar)
getFooAndBar param =
    case getFoo param of
        Null -> Null
        NonNull foo -> case getBar param foo of
            Null -> Null
            NonNull bar -> NonNull (foo, bar)
{% endhighlight %}

Each time we need to use an `Optional` value, we have to do `case` analysis to determine if it's `Null`. This works, but it's annoying to read. Just like with JavaScript callbacks, the real business logic is obscured by all the null-checking we have to do. It'd be great if we could automate those checks and make them implicitly do the right thing, so we didn't have to pay attention to them.

How could we avoid that? One thing we could do is write a function that transforms wrapped values properly - it'll do something to transform the wrapped value (if it exists), otherwise it won't do anything.

{% highlight haskell %}
mapOver :: (a -> b) -> Optional a -> Optional b
mapOver f Null = Null
mapOver f (NonNull a) = NonNull (f a)
{% endhighlight %}

We can check that this works:

{% highlight haskell %}
> mapOver (+3) Null
Null
> mapOver (+3) (NonNull 7)
NonNull 10
{% endhighlight %}

Nice! That can make some things a little more concise. (But it doesn't solve our problem yet - we'd end up with an `Optional (Optional (Foo, Bar))` if we tried to rewrite `getFooAndBar` using `mapOver`. We need a bit more machinery before we can clean this up.)

### Functors
It turns out that this is a common pattern in Haskell, so there's a typeclass that captures the idea of mapping some function over a structure, transforming the contents appropriately. That typeclass is called `Functor`, and looks like this:

{% highlight haskell %}
class Functor f where
    fmap :: (a -> b) -> f a -> f b
{% endhighlight %}

We can immediately notice that `mapOver` has the same signature as `fmap` with `Optional` replacing `f`, so it's tempting to say that `mapOver` should be `Optional`'s implementation of `fmap`. But there are two rules that each version of `fmap` must follow; we should check that `mapOver` follows them.

The first rule is that mapping the identity function (`id`) should be the same as not doing anything at all. I.e., `fmap id == id`. We can verify this equation by manipulating it and substituting some terms with their definitions, for both cases of our datatype. (This kind of manipulation and symbolic evaluation is called "equational reasoning", and is correct because of Haskell's immutability and purity.) First, we try with `Null`:

```
fmap id Null ==> Null
id Null ==> Null
```

Very straightforward: we end up with the same result when we evaluate `fmap id` and `id` on `Null`, so we're good so far. Now the other case:

```
fmap id (NonNull x) ==> NonNull (id x) ==> NonNull x
id (NonNull x) ==> NonNull x
```

This case was also straightforward: evaluating `fmap id` and `id` on `NonNull x` also gives the same result, so `fmap id` and `id` are also equivalent in this case. Since these two cases cover all possible values of an `Optional a`, we're done with the proof: `mapOver` satisfies the first functor law.

The second law says that it shouldn't matter whether you map the composition of two functions over the functor, or map each function separately; you should get the same result in either case. I.e., `fmap (f . g) == fmap f . fmap g`. (Note that the `.` operator means ["function composition"](https://en.wikipedia.org/wiki/Function_composition); the Haskell syntax mimics the math syntax.) Let's check that this holds for both cases:

```
fmap (f . g) Null ==> Null
(fmap f . fmap g) Null ==> fmap f (fmap g Null) ==> fmap f (Null) ==> Null
```

The `Null` case works - how about the next case? This one's a little trickier, since we don't know what `f` and `g` actually are. But we can still manipulate them the same way we'd solve an algebraic equation:

```
fmap (f . g) (NonNull x) ==> NonNull ((f . g) x) ==> NonNull (f (g x))
(fmap f . fmap g) (NonNull x) ==> fmap f (fmap g (NonNull x)) ==> fmap f (NonNull (g x)) ==> NonNull (f (g x))
```

This law is also satisfied, so we're done. We can now confidently write the `Functor` instance for `Optional`:

{% highlight haskell %}
instance Functor Optional where
    fmap f wv = mapOver f wv
{% endhighlight %}

Great! Now we can easily apply functions to values that have been wrapped in the `Optional` type.

### Applicatives

But... functions are *also* values that can be passed around and might be null, so we could imagine wrapping a function in the `Optional` type too. What if we wanted to apply a wrapped function to a wrapped value? We could write a function to do this:

{% highlight haskell %}
applyMaybe :: Optional (a -> b) -> Optional a -> Optional b
applyMaybe (NonNull f) (NonNull x) = NonNull (f x)
applyMaybe _ _ = Null
{% endhighlight %}

Not terribly interesting, but it does the trick: if both the function and the value are non-null, we get the result of applying the function to the value; otherwise, we just get `Null`. You're probably not surprised to find out that this is also a common pattern, so there's a typeclass for it: `Applicative`. The definition looks like this:

{% highlight haskell %}
class Functor f => Applicative f where
    (<*>) :: f (a -> b) -> f a -> f b
    pure :: a -> f a
{% endhighlight %}

Right off the bat, we notice the `Functor f =>` bit. This just means that in order for `f` to be an `Applicative`, it must also be a `Functor`. That's fine by us, since we already know that `Optional` is a `Functor`. The first function, `(<*>)`, is an operator that takes a wrapped function and a wrapped value, and produces a wrapped result. That looks exactly like what our `applyMaybe` does! The next function, `pure`, takes a normal value and turns it into a wrapped value. This is a good utility to have, since it allows us to apply wrapped functions to normal values, using the `(<*>)` operator.

It shouldn't surprise you to learn that there are similar [laws](https://en.wikibooks.org/wiki/Haskell/Applicative_functors#Applicative_functor_laws) for `(<*>)` and `pure` to follow, but this time I'll spare the suspense: `applyMaybe` and the obvious implementation of `pure` do follow them, so we can write our `Applicative` instance:

{% highlight haskell %}
instance Applicative Optional where
    wf <*> wv = applyMaybe wf wv
    pure x = NonNull x
{% endhighlight %}

This lets us do things like:

{% highlight haskell %}
> (NonNull (+3)) <*> Null
Null
> (NonNull (+3)) <*> (NonNull 5)
NonNull 8
> Null <*> (NonNull 5)
Null
{% endhighlight %}

Maybe not the most earth-shattering of improvements, but it lets us automate just a little bit more pattern matching.

### Monads
Now, for the payoff: we've written an `Applicative` instance[^applicative], so we can finally write a `Monad` instance for our type. The `Monad` class only needs us to provide a single operator, called `(>>=)`, but every `Monad` also has some other functions (namely `(>>)` and `return`)[^others]. Let's check out the type signature of `(>>=)`:

{% highlight haskell %}
> :t (>>=)
(>>=) :: Monad m => m a -> (a -> m b) -> m b
{% endhighlight %}

The `Monad m =>` part reminds us that `m` must be a `Monad`, and the rest tells us that the left operand of `(>>=)` is a wrapped value, the right operand is a function that takes a normal value and produces a wrapped value, and the result is another wrapped value. How could we implement this for `Optional`? Well, for `Optional`, we're ultimately trying to produce an `Optional b`. We have a function that produces an `Optional b`, if we can supply it a value of type `a`. The only way we could get a value of type `a` is if the wrapped value is a `NonNull a`. So we'll pattern match on the wrapped value, and apply the function `f` if it's a `NonNull a`; otherwise, the only way we could produce a value of type `Optional b` is by returning `Null`.

{% highlight haskell %}
instance Monad Optional where
    Null >>= f = Null
    (NonNull x) >>= f = f x
{% endhighlight %}

As usual, there are [laws](https://en.wikipedia.org/wiki/Monad_(functional_programming)#Monad_laws) that this implementation of `(>>=)` must follow, but verifying them is left as an exercise for the reader.

Now, what does our `getFooAndBar` function look like?

{% highlight haskell %}
getFooAndBar :: Param -> Optional (Foo, Bar)
getFooAndBar param =
    getFoo param >>= (\foo ->
        getBar param foo >>= (\bar ->
            return (foo, bar)))
{% endhighlight %}

That's much better than the original. There's no explicit null-checking, and the business logic is easy to read. Just to jog your memory, here's the JS version we settled on with Promises:

{% highlight javascript %}
function getFooAndBar(param) {
    return getFoo(param).then((foo) =>
        getBar(param, foo).then((bar) =>
             Promise.resolve({foo, bar})));
}
{% endhighlight %}

It's interesting how similar they look, no?

### Do-notation

JavaScript introduced new syntax (built on top of Promises) to make them easier to use, and I claimed that this syntax had an analog in Haskell, but the Haskell version worked for any monad. Well, now that we've written our `Monad` instance, it's time to introduce "do-notation". Do-notation is a set of rules that the Haskell compiler uses to rewrite code. These rules let us write monadic code without using the `(>>=)` operator (or its cousin, the `(>>)` operator), and the compiler will automatically rewrite it in terms of `(>>=)` and `(>>)`. Let's rewrite our running example using do-notation:

{% highlight haskell %}
getFooAndBar :: Param -> Optional (Foo, Bar)
getFooAndBar param = do
    foo <- getFoo param
    bar <- getBar param foo
    return (foo, bar)
{% endhighlight %}

This is much easier to read. It even looks like imperative code, almost! The syntax corresponds cleanly to how we would think about the code: "first, extract a `foo` (if possible), then extract a `bar` (if possible), and finally return the `(foo, bar)` pair. The "win" here is that every step of this function is automatically checked for `Null` (and the function will bail out and return `Null` if any of the steps produce `Null`), but we didn't have to write it out each time - and we don't have to read it, either. That makes it easier to see the important details of the function, without getting bogged down by the boilerplate.

# Other Monads

We know that since we're using the `Optional` monad, which does null-checking for us, each one of those `<-` represents a null check. In a different monad, they could represent something else. Just to jog our memories, here are the two JavaScript monads we used in the previous post, written with the real `async/await` syntax and the fictional `multi/pick` syntax:

{% highlight javascript %}
async function getFooAndBar(param) {
    const foo = await getFoo(param);
    const bar = await getBar(param, foo);
    return Promise.resolve({foo, bar});
}

multi function genFilenames(prefixes) {
    const prefix = pick prefixes;
    const i = pick range(0, 9);
    return Array.of(prefix + i.toString());
}
{% endhighlight %}

And the Haskell equivalents (substituting the `Optional` type for the `Promise` type):

{% highlight haskell %}
getFooAndBar :: Param -> Optional (Foo, Bar)
getFooAndBar param = do
    foo <- getFoo param
    bar <- getBar param foo
    return (foo, bar)

genFilenames :: [String] -> [String]
genFilenames prefixes = do
    prefix <- prefixes
    i <- [0..9]
    return (prefix ++ show i)
{% endhighlight %}

Now that we've seen do-notation, it's easy to see the similarity between these syntaxes (even though they're in different languages). `do` corresponds to `async`[^async] and `multi`; `<-` corresponds to `await` and `pick`.

As I claimed in the previous post, monads are just a way of composing "fancy" functions together, for some definition of "fancy". We've seen how this works when "fancy" means "this function might produce null"; we've also seen how this works when "fancy" means "this function produces several outputs, not just one". Some other well-known monads, described as their particular definition of "fancy", are:

* ["this function also writes to some kind of log"](http://hackage.haskell.org/package/mtl-2.2.2/docs/Control-Monad-Writer.html)
* ["this function might fail for some reason"](http://hackage.haskell.org/package/base-4.11.1.0/docs/Prelude.html#t:Either)
* ["this function also reads from a configuration/global value"](http://hackage.haskell.org/package/mtl-2.2.2/docs/Control-Monad-Reader.html#t:MonadReader)
* ["this function also reads and writes to some kind of state"](http://hackage.haskell.org/package/mtl-2.2.2/docs/Control-Monad-State-Lazy.html#t:MonadState)
* ["this function depends on the state of the 'real world'"](http://hackage.haskell.org/package/base-4.11.1.0/docs/Prelude.html#t:IO)

And of course, ["this function will execute at some point in the future, and may fail"](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), as well as many others.

Hopefully you can see that these are common patterns. Some monads (e.g. `IO`) aren't very useful outside of a statically typed, pure functional language; but others, like `Promise` and `List`, are useful to know about regardless of what programming language you happen to be using. Thanks for reading!

---

[^trap]:
    I seem to have fallen into the same trap that every Haskeller eventually falls into: trying to explain Monads with a tutorial that will (somehow) be better than all the myriad others.

[^io]:
    Haskell functions aren't allowed to have any side effects, yet Haskell is a general purpose language, so there must be some way for functions to print to the screen, send network requests, and other things that are done via side effects in other languages. We can think of these side effects as just modifications of the current state of the world - so if our functions took "the world" as a parameter, and returned a new version of the world as output, we'd be all set. It turns out that this is essentially what Haskell pretends to do, with the [`IO`](http://hackage.haskell.org/package/base-4.11.1.0/docs/Prelude.html#t:IO) monad. This idea was originally presented in [this groundbreaking paper](https://www.microsoft.com/en-us/research/wp-content/uploads/1993/01/imperative.pdf) - see section 4.

[^laziness]:
    But laziness does come at a cost. Haskell represents an unevaluated value as a function that can be called to evaluate it; when that function is called, Haskell will throw away the function and just save the value it produced. That means there's some overhead to setting up laziness - namely, the cost of creating, storing, and calling the function. If an expression is always evaluated, then the laziness isn't needed, and the overhead is a waste of time.

[^other_laziness]:
    It's so useful that some strict languages, e.g. Java and Rust, have adopted it in certain situations. Java's `Stream`s are lazily evaluated, as are Rust's `Iterator`s.

[^caveats]:
    Note that there are some differences between the Promise example and the Optional example. Promises can do things like network IO, while `Optionals` (by themselves) cannot; rejected `Promises` provide a reason for failure, whereas `Optionals` are just `Null` and don't tell us why. Promises essentially combine the [Continuation monad](http://hackage.haskell.org/package/mtl-2.2.2/docs/Control-Monad-Cont.html#t:MonadCont) with the [`Either`](http://hackage.haskell.org/package/base-4.11.1.0/docs/Prelude.html#t:Either) monad.

[^applicative]:
    Question for the reader: why is an `Applicative` instance required for a `Monad` instance? (Hint: how does Haskell know what a `Monad`'s `return` function should do, if we don't have to define it ourselves?)

[^others]:
    There are other functions and operators associated with the `Monad` class, but the compiler can figure out how to implement them, based on `(>>=)` and the `Applicative` and `Functor` instances for the type.

[^async]:
    It's worth noting that `async/await` is a little more complicated than do-notation, since it doesn't "just" rewrite code: it also has to change the semantics of `try`/`catch`, `while`, and `for`, and it changes the behavior of the interpreter. But the syntax is still similar, even if the semantics are slightly more involved.
