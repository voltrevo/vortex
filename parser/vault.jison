/* description: Parses the vault language and generates the syntax tree. */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
'{'                   return '{'
'}'                   return '}'
'if'                  return 'IF'
'func'                return 'FUNC'
'return'              return 'RETURN'
'break'               return 'BREAK'
'continue'            return 'CONTINUE'
[a-zA-Z]\w*           return 'IDENTIFIER'
";"                   return ';'
[0-9]+("."[0-9]+)?\b  return 'NUMBER'
"**"                  return '**'
"*"                   return '*'
"/"                   return '/'
"-"                   return '-'
"+"                   return '+'
"("                   return '('
")"                   return ')'
":="                  return ':='
"="                   return '='
":"                   return ':'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

%right ':=' '='
%left '+' '-'
%left '*' '/'
%right '**'
%left UMINUS

%start program

%% /* language grammar */

program
    : statements EOF
        { console.log(require('util').inspect($1, { depth: 8, colors: true })); }
    ;

statements
    :
        {$$ = []}
    | statements statement
        {$$ = [...$1, $2]}
    ;

statement
    : func
        {$$ = $1}
    | e ';'
        {$$ = $1}
    | RETURN e ';'
        {$$ = ['return', $2]}
    | BREAK ';'
        {$$ = ['break']}
    | CONTINUE ';'
        {$$ = ['continue']}
    | if
        {$$ = $1}
    ;

if
    : IF '(' e ')' block
        {$$ = ['if', $3, $5]}
    ;

func
    : FUNC funcName '(' params ')' block
        {$$ = ['func', $2, $4, $6]}
    ;

funcName
    :
        {$$ = null}
    | IDENTIFIER
        {$$ = $1}
    ;

params
    :
        {$$ = ['params', []]}
    | params param
        {$$ = ['params', [...$1[1], $2.slice(1)]]}
    ;

param
    : IDENTIFIER ':' IDENTIFIER
        {$$ = ['param', $1, $3]}
    ;

block
    : '{' statements '}'
        {$$ = ['block', $2]}
    ;

e
    : e '+' e
        {$$ = ['+', $1, $3];}
    | e '-' e
        {$$ = ['-', $1, $3];}
    | e '*' e
        {$$ = ['*', $1, $3];}
    | e '/' e
        {$$ = ['/', $1, $3];}
    | e '**' e
        {$$ = ['**', $1, $3];}
    | '-' e %prec UMINUS
        {$$ = ['-', $2];}
    | '(' e ')'
        {$$ = $2;}
    | NUMBER
        {$$ = ['NUMBER', $1];}
    | IDENTIFIER
        {$$ = ['IDENTIFIER', $1];}
    | e ':=' e
        {$$ = [':=', $1, $3]}
    | e '=' e
        {$$ = ['=', $1, $3]}
    | func
        {$$ = $1}
    ;
