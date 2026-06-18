function brokenGreeting(name) {
  if (name) {
    return `Hello, {nam}`;
  }

  return "Hello, guest";
}

const message = brokenGreeting("Jenkins");
console.log(message);
