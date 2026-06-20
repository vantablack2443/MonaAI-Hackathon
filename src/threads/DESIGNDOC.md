# Design Document: Project 1 - Threads

## Preliminaries

> If you have any preliminary comments on your submission, notes for the
> TAs, or extra credit, please give them here.

> Please cite any offline or online sources you consulted while
> preparing your submission, other than the Pintos documentation, course
> text, lecture notes, and course staff.

> Please disclose any use of AI tools. The use of generative AI tools
> and AI coding assistants is not disallowed, but it is discouraged. If
> you choose to use AI tools, use them responsibly so they do not
> interfere with your learning.



## Alarm Clock

### Data Structures

> A1: Copy here the declaration of each new or changed `struct` or
> `struct` member, global or static variable, `typedef`, or
> enumeration.  Identify the purpose of each in 25 words or less.

### Algorithms

> A2: Briefly describe what happens in a call to `timer_sleep()`,
> including the effects of the timer interrupt handler.

> A3: What steps are taken to minimize the amount of time spent in
> the timer interrupt handler?

### Synchronization

> A4: How are race conditions avoided when multiple threads call
> `timer_sleep()` simultaneously?

> A5: How are race conditions avoided when a timer interrupt occurs
> during a call to `timer_sleep()`?

### Rationale

> A6: Why did you choose this design?  In what ways is it superior to
> another design you considered?



## Producer-Consumer

### Synchronization

> B1: How does your solution guarantee that consumers will block until
> there is something to consume in the buffer?

> B2: How does your solution guarantee that producers will block until
> there is some free space in the buffer?

> B3: How does your solution preserve FIFO semantics, i.e., the first
> character produced will be the first to be consumed?

### Rationale

> B4: Give an intuition for why your program preserves safety.

> B5: Why did you choose this design? Did you consider other design
> alternatives? In what ways is it superior to another design you considered?



## Priority Scheduling

### Data Structures

> C1: Copy here the declaration of each new or changed `struct` or
> `struct` member, global or static variable, `typedef`, or
> enumeration.  Identify the purpose of each in 25 words or less.

> C2: Explain the data structure used to track priority inheritance.
> Use ASCII art to diagram transitive inheritance.  (Alternatively,
> submit a `.pdf` file.)

### Algorithms

> C3: How do you ensure that the highest priority thread waiting for
> a lock, semaphore, or condition variable wakes up first?

> C4: Describe the sequence of events when a call to `lock_acquire()`
> causes priority inheritance.  How is transitive inheritance handled?

> C5: Describe the sequence of events when `lock_release()` is called
> on a lock that a higher-priority thread is waiting for.

### Synchronization

> C6: Describe a potential race in `thread_set_priority()` and explain
> how your implementation avoids it.  Can you use a lock to avoid
> this race?

### Rationale

> C7: Why did you choose this design?  In what ways is it superior to
> another design you considered?



## Additional Comments [Optional]

> Feel free to share anything else here.
