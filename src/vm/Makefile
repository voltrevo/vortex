all: bin/run bin/scratch bin/asm bin/dasm test

bin/run: *.*pp
	clang++ -std=c++17 -g run.cpp -o bin/run

bin/scratch: *.*pp
	clang++ -std=c++17 -g scratch.cpp -o bin/scratch

bin/asm: *.*pp
	clang++ -std=c++17 -g asm.cpp -o bin/asm

bin/dasm: *.*pp
	clang++ -std=c++17 -g dasm.cpp -o bin/dasm

test: bin/run
	bash ./testFiles/test

clean:
	rm bin/*
