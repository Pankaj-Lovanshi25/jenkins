function brokenGreeting(name) {
  if (name) {
    return `Hello, ${name}`;
  }

  return "Hello, guest";
}

const message = brokenGreeting("Jenkins");
console.log(message;
