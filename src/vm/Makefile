all: bin/run bin/scratch bin/asm bin/dasm test

bin/run: *.*pp
	clang++ -I. -std=c++17 -O3 run.cpp -o bin/run

bin/scratch: *.*pp
	clang++ -I. -std=c++17 -O3 scratch.cpp -o bin/scratch

bin/asm: *.*pp
	clang++ -I. -std=c++17 -O3 asm.cpp -o bin/asm

bin/dasm: *.*pp
	clang++ -I. -std=c++17 -O3 dasm.cpp -o bin/dasm

test: bin/run
	bash ./testFiles/test

clean:
	rm bin/*
