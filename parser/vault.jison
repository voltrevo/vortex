/* description: Parses the vault language and generates the syntax tree. */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
[a-zA-Z]\w*           return 'IDENTIFIER'
":="                  return ':='
"="                   return '='
";"                   return ';'
[0-9]+("."[0-9]+)?\b  return 'NUMBER'
"*"                   return '*'
"/"                   return '/'
"-"                   return '-'
"+"                   return '+'
"^"                   return '^'
"!"                   return '!'
"%"                   return '%'
"("                   return '('
")"                   return ')'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

%left '+' '-'
%left '*' '/'
%left '^'
%right '!'
%right '%'
%left UMINUS
%right ':=' '='

%start program

%% /* language grammar */

program
    : statements EOF
        { console.log($1); }
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
    ;

e
    : e '+' e
        {$$ = $1+$3;}
    | e '-' e
        {$$ = $1-$3;}
    | e '*' e
        {$$ = $1*$3;}
    | e '/' e
        {$$ = $1/$3;}
    | e '^' e
        {$$ = Math.pow($1, $3);}
    | e '!'
        {{
          $$ = (function fact (n) { return n==0 ? 1 : fact(n-1) * n })($1);
        }}
    | e '%'
        {$$ = $1/100;}
    | '-' e %prec UMINUS
        {$$ = -$2;}
    | '(' e ')'
        {$$ = $2;}
    | NUMBER
        {$$ = Number(yytext);}
    | IDENTIFIER
        {$$ = ['IDENTIFIER', $1];}
    | e ':=' e
        {$$ = [':=', $1, $3]}
    | e '=' e
        {$$ = ['=', $1, $3]}
    ;
