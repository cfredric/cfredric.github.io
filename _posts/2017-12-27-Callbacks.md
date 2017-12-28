---
layout: post
title: The Nature of Callbacks
---

I want to take you down the journey I went down, when I initially learned about
JavaScript `Promise`s for work. I happened to be teaching myself Haskell at the
time, for fun, and I was determined to not be intimidated by these infamous
"monad" things. Without further ado...

# The Problem: callbacks are terrible

As in any language, some things are just slow - like writing to a file, or
sending a request over the network. JavaScript is single-threaded, so it can't
afford to pause the whole app while waiting for a single network response.
Instead, it handles these slow things by using nonblocking execution.
JavaScript handles nonblocking execution by making some functions asynchronous.
Whole blog posts can be (and have been) written explaining exactly how that is
implemented, but it essentially means that the caller will return before the
callee. That's fine, but it means we have to use [continuation-passing
style](https://en.wikipedia.org/wiki/Continuation-passing_style) and use
callbacks, since we can't return values anymore. Fine. But asynchronous
functions don't work with JavaScript's error-handling model either: if the
caller has already returned (and V8 has cleaned up its stack, etc), then
there's nothing to catch any exception that could be thrown by the callee. So
asynchronous functions shouldn't throw exceptions - they have to indicate an
error via some other means. (E.g. by passing an extra parameter to the
callback, or by stuffing the error into some global variable.)

Fine, we can work with this - and this was just "the way it was" for a while.
But some things became annoying...

**Error handling.** It's annoying to have to remember to check for, and handle,
errors after every asynchronous function call. It quickly leads to code like
this:

{% highlight javascript linenos %}
function getFooAndBar(param, callback) {
    getFoo(param, function(err, foo) {
        if (err) return callback(err, null, null);
        getBar(param, foo, function(err, bar) {
            if (err) return callback(err, null, null);
            callback(null, foo, bar);
        });
    });
}
{% endhighlight %}

9 lines of code just to say "if anything goes wrong, defer the error handling
until something else knows what to do, but abort the current function". The
business logic is obscured behind the layers of error-forwarding and anonymous
functions; this code is not as easy to read as it could be.

**Nesting**. The previous code snippet showed another problem as well - the
rightward drift of sequences of asynchronous functions. We had two extra levels
of indentation after doing just two asynchronous calls; clearly this gets worse
the more asynchronous calls in the code.

## The Solution - part 1

Both of the above problems can be solved, with enough engineering work. This
work culminates in a class called a
[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
There are other blog posts
([example](http://www.mattgreer.org/articles/promises-in-wicked-detail/)) on
how to hack on a promise implementation until it's robust and feature-complete;
this post won't do that. Instead, I'll just show that it indeed solves the
above pain points, and move on.

**The Good.** Promises carry error-state along with them as execution moves
through the continuations: as soon as an error occurs, the promise is rejected,
and won't run any more continuations on the "happy path" until the error is
handled and the promise becomes "resolved" again. So, it's no longer necessary
to check for errors and forward them along yourself. The 9 line example above
would become:

{% highlight javascript linenos %}
function getFooAndBar(param) {
    return getFoo(param)
        .then((foo) => {
            return getBar(param, foo)
                .then((bar) => ({foo, bar}));
        });
}
{% endhighlight %}

Look at that! No explicit error handling. Beautiful. Except...

**The ugly.** We still have nesting problems. In the example above, the final
return value (`{foo, bar}`) needs `foo` to be in scope, so we have to nest the
scopes. Additionally, having to `return` so many different things is a little
weird. Functional programmers may be fine with it, but JavaScript started out
as an imperative language; it would be nice to keep it looking like one.
Finally, now we have better error handling, but we're still stuck having two
different kinds of errors: normal thrown exceptions, and rejected promises. It
would be nice if we didn't have to care about the particular error type, and
just handle the error regardless of whether it was synchronous or asynchronous.

## The Solution - part 2

Promises don't require any baked-in language support, but if we're going to
solve these last few ugly bits, the interpreter has to give us some help. What
we want, ideally, is to be able to abstract over whether a function was
synchronous or asynchronous; we want them to look almost identical, at least as
far as source code is concerned.

One way for this to work is for the language to have a built-in understanding
of promises: it'll provide a way to "pause" execution until a given promise
resolves, and it'll provide a way to handle promises that reject along the way.
(Of course, the execution doesn't *really* pause, since that would defeat the
purpose of the asynchronous call. But we can write code that pretends it
pauses.) These are the ideas behind the `async`/`await` feature in ES8. Without
further ado, let's see how it improves our running example:

{% highlight javascript linenos %}
async function getFooAndBar(param) {
    const foo = await getFoo(param);
    const bar = await getBar(param, foo);
    return {foo, bar};
}
{% endhighlight %}

That. Is. Beautiful. No explicit error-forwarding, no more nesting. There's
nothing left to distract from the business logic. But what's the error-handling
story?

{% highlight javascript linenos %}
async function processFooAndBar(param) {
    try {
        const {foo, bar} = await getFooAndBar(param);
        validateBar(bar);
    } catch(err) {
        // Any errors from getting the foo and bar, or
        // validating the bar, come here.
    }
}
{% endhighlight %}

Synchronous errors and asynchronous errors are now syntactically identical -
awesome. We no longer need to be distracted from the business logic, and can
let the language make error handling easy.

# Promises: Origin Story

Now for the fun part. At this point, we should be asking ourselves: can we
solve other problems this nicely? Could the solutions look anything like this?

The answers are, yes, and yes. Before seeing why, let's switch languages, and
switch problems. We'll use Haskell, and we'll imagine we have a bunch of
functions that might fail. Haskell has a type that can represent an optional
value; we'll use that as a function's return type to indicate that the function
failed. The type's definition looks like this:

{% highlight haskell %}
data Maybe a = Just a | Nothing
{% endhighlight %}

(In this definition, `a` is a type parameter; you can think of it like the `<E>`
in Java's generic collections, or in C++'s templated classes.) The definition
could be read aloud like this: "a `Maybe a` is a data type that may either be a
`Just a` or a `Nothing`". Some example values (and their types) are:

* `Just 3 :: Maybe Int`
* `Just 'c' :: Maybe Char`
* `Nothing :: Maybe a`

Ok, so we know what `Maybe`s look like. Let's do something with them! I'll pick
an example that looks suspiciously close to something we've seen before, but
instead of being asynchronous *and* failure prone, this time it's just failure
prone.

{% highlight haskell linenos %}
getFooAndBar :: Param -> Maybe (Foo, Bar)
getFooAndBar param = case getFoo param of
  Nothing -> Nothing
  Just foo -> case getBar param foo of
    Nothing -> Nothing
    Just bar -> Just (foo, bar)
{% endhighlight %}

Haskell looks a bit different from the JavaScript - it has different syntax for
function application, and it supports pattern matching and case analysis. But
overall that looks very familiar: we see the same problems of manual
error-forwarding and rightward drift as we did in the first JS callbacks
example. Let's find ways to fix those, one step at a time.

### The Solution - part 1

We want to design a pipeline that, as soon as it detects something has returned
`Nothing`, stops doing anything until we explicitly handle the `Nothing`. In
Haskell, all behavior is encoded in functions, so this will be a function. We
want it to be a function that takes a value from the pipeline and a way to
transform that value (if no error has happened yet), and produces the next
value. I.e., it takes a `Maybe a` and a function of type `a -> Maybe b`, and
produces a `Maybe b`. For the sake of brevity and evoking "pipeline" imagery,
I'll implement this function as the `>>=` operator. Here's what it could look
like:

{% highlight haskell %}
(>>=) :: Maybe a -> (a -> Maybe b) -> Maybe b
ma >>= f = case ma of
  Nothing -> Nothing
  Just a -> f a
{% endhighlight %}

Not too bad. This is the same kind of case analysis that we did before, so what
did we just gain? Well, now we can use it to write this: (Note: this uses
Haskell's syntax for anonymous functions: `\x -> e` is an anonymous function
that takes in `x`, and evaluates to `e`.)

{% highlight haskell linenos %}
getFooAndBar :: Param -> Maybe (Foo, Bar)
getFooAndBar param =
  (getFoo param) >>= (\foo ->
    (getBar param foo) >>= (\bar ->
      Just (foo, bar)))
{% endhighlight %}

Again, not bad - there's no more manual error handling. But we still have
nesting problems, just like before. Perhaps unsurprisingly, we'll need language
support to solve the nesting problem.

### The Solution - part 2

Ideally, the solution to this problem would let us express the same pipeline as
above, without needing to explicitly create the anonymous functions and funnel
them through `>>=`. Haskell provides this through something called "`do`
notation". `do` notation takes code written with `do`, and rewrites it using
`>>=` and anonymous functions for us. I'll show what I mean - here's our
familiar code, in its (almost) final form:

{% highlight haskell linenos %}
getFooAndBar :: Param -> Maybe (Foo, Bar)
getFooAndBar param = do
  foo <- getFoo param
  bar <- getBar param foo
  Just (foo, bar)
{% endhighlight %}

Nice! No anonymous, nested functions to worry about; and no manual error
handling. Just business logic.

### The Solution - part 3

Hopefully you're saying to yourself, "wait, hang on. How did the compiler know
how to rewrite our code? Is `Maybe` special? Was it because it used `>>=`?  Is
that a special symbol?" Great questions, and you're right, this doesn't make
sense yet, because I've omitted some details so far.

In reality, "`do` notation" only knows how to rewrite things called "monads". A
"monad" is something that implements two functions (`>>=` and `return`) such
that they satisfy certain equations, and that declares itself as an instance of
the `Monad` class. As we saw, `>>=` takes a value out of a data type (which
I'll call its context), and uses another function to produce another,
transformed version of that data type. The full, real code (including the
`Monad` instance for `Maybe`) for our Haskell example is the following:

{% highlight haskell linenos %}
instance Monad Maybe where
  ma >>= f = case ma of
    Just a -> f a
    _ -> Nothing

  return = Just


getFooAndBar :: Param -> Maybe (Foo, Bar)
getFooAndBar param = do
  foo <- getFoo param
  bar <- getBar param foo
  return (foo, bar)
{% endhighlight %}

That's it! The compiler now knows that `Maybe` is a monad, so it knows we're
allowed to use "`do` notation" with it. (Of course, since `Maybe` is provided in
Haskell's Prelude, in practice its `Monad` instance is already [written for
us](http://hackage.haskell.org/package/base-4.10.1.0/docs/src/GHC.Base.html#line-729).)


# What's the point?
![But Why?]({{ "/images/but_why.gif" | absolute_url }})

We've come a long way from writing callbacks in JavaScript. We've seen that
`Promises` and `async`/`await` provide a really nice way to solve the pain
points of callbacks. We've seen that "`do` notation" and monads lead us to a
similar solution to a similar problem in Haskell. But now it's clear that
`Promise`s and `async`/`await` are the same thing as `Maybe`s and "`do`
notation"! `Promise`s are just a different monad[^1] - one that combines "this
might fail for some reason" with "this may happen in the future".

Monads are extremely useful. There are a lot of them: `Maybe`, `Promise`,
lists, `Either`, the world as we know it (`IO`), and countless more. Hopefully
I've demystified them somewhat here, and illustrated that they're a really
useful way of composing functions into pipelines, without drowning in
boilerplate!

[^1]: Promises *technically* aren't a monad, because `.then` (the equivalent of `>>=`) doesn't quite satisfy the equations I mentioned earlier. But it's close enough to still be really nice to use.