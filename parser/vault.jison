/* description: Parses the vault language and generates the syntax tree. */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
'{'                   return '{'
'}'                   return '}'
'if'                  return 'IF'
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
        { console.log(require('util').inspect($1, { depth: 6, colors: true })); }
    ;

statements
    : statement
        {$$ = [$1]}
    | statements statement
        {$$ = [...$1, $2]}
    ;

statement
    : e ';'
        {$$ = $1}
    | if
        {$$ = $1}
    ;

if
    : IF '(' e ')' block
        {$$ = ['if', $3, $5]}
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
    ;
