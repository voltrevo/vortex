all: bin/run bin/scratch bin/asm bin/dasm test

CC = clang++
FLAGS = -I. -std=c++17 -O3
COMMON_FILES = Codes.cpp Value.cpp Object.cpp Array.cpp Func.cpp Exceptions.cpp runBuiltInMethod.cpp

COMPILE = $(CC) $(FLAGS) $(COMMON_FILES)

bin/run: *.hpp $(COMMON_FILES) run.cpp Makefile
	$(COMPILE) run.cpp -o bin/run

bin/scratch: *.hpp $(COMMON_FILES) scratch.cpp Makefile
	$(COMPILE) scratch.cpp -o bin/scratch

bin/asm: *.hpp $(COMMON_FILES) asm.cpp Makefile
	$(COMPILE) asm.cpp -o bin/asm

bin/dasm: *.hpp $(COMMON_FILES) dasm.cpp Makefile
	$(COMPILE) dasm.cpp -o bin/dasm

test: bin/run
	bash ./testFiles/test

clean:
	rm bin/*
