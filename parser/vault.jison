/* description: Parses the vault language and generates the syntax tree. */

/* lexical grammar */
%lex
%%

"//".*                /* skip line comments */
[/][*][^*]*[*]+([^/*][^*]*[*]+)*[/]   /* skip block comments */
\s+                   /* skip whitespace */
'{'                   return '{'
'}'                   return '}'
'if'                  return 'IF'
'for'                 return 'FOR'
'of'                  return 'OF'
'func'                return 'FUNC'
'return'              return 'RETURN'
'break'               return 'BREAK'
'continue'            return 'CONTINUE'
'import'              return 'IMPORT'
'from'                return 'FROM'
'class'               return 'CLASS'
'static'              return 'STATIC'
'switch'              return 'SWITCH'
[a-zA-Z]\w*           return 'IDENTIFIER'
";"                   return ';'
[0-9]+("."[0-9]+)?\b  return 'NUMBER'
["][^"]*["]           return 'STRING'
['][^']*[']           return 'STRING'
'=>'                  return '=>'
"**"                  return '**'
":="                  return ':='
"++"                  return '++'
"--"                  return '--'
"<<"                  return '<<'
">>"                  return '>>'
"<="                  return '<='
">="                  return '>='
"=="                  return '=='
"!="                  return '!='
"&&"                  return '&&'
"||"                  return '||'
"+="                  return '+='
"-="                  return '-='
"*="                  return '*='
"/="                  return '/='
"%="                  return '%='
"<<="                 return '<<='
">>="                 return '>>='
"&="                  return '&='
"^="                  return '^='
"|="                  return '|='
"*"                   return '*'
"/"                   return '/'
'%'                   return '%'
"-"                   return '-'
"+"                   return '+'
"("                   return '('
")"                   return ')'
"="                   return '='
":"                   return ':'
","                   return ','
"!"                   return '!'
"~"                   return '~'
"<"                   return '<'
">"                   return '>'
"&"                   return '&'
"^"                   return '^'
"|"                   return '|'
'['                   return '['
']'                   return ']'
'.'                   return '.'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

%right FUNC
%right ':=' '=' '+=' '-=' '*=' '/=' '%=' '<<=' '>>=' '&=' '|=' '^='
%left ':'
%left '||'
%left '&&'
%left '|'
%left '^'
%left '&'
%left '==' '!='
%left '<' '>' '>=' '<='
%left '<<' '>>'
%left '+' '-'
%left '*' '/' '%'
%right '**'
%left '!' '~' PREFIX POSTFIX '++' '--'
%left '(' ')' '[' ']' '.'

%start program

%% /* language grammar */

program
    : statements EOF
        { console.log(require('util').inspect($1, { depth: 10, colors: true })); }
    ;

statements
    :
        {$$ = []}
    | statements statement
        {$$ = [...$1, $2]}
    ;

statement
    : e ';'
        {$$ = $1}
    | RETURN e ';'
        {$$ = ['return', $2]}
    | BREAK ';'
        {$$ = ['break']}
    | CONTINUE ';'
        {$$ = ['continue']}
    | if
        {$$ = $1}
    | for
        {$$ = $1}
    | import ';'
        {$$ = $1}
    ;

if
    : IF '(' e ')' block
        {$$ = ['if', $3, $5]}
    ;

for
    : FOR block
        {$$ = ['for', ['loop'], $2]}
    | FOR '(' e ')' block
        {$$ = ['for', ['condition', $3], $5]}
    | FOR '(' IDENTIFIER OF e ')' block
        {$$ = ['for', ['of', $3, $5], $7]}
    | FOR '(' e ';' e ';' e ')' block
        {$$ = ['for', ['traditional', $3, $5, $7], $9]}
    ;

import
    : IMPORT IDENTIFIER
        {$$ = ['import', $2]}
    | IMPORT IDENTIFIER FROM STRING
        {$$ = ['import', $2, $4]}
    ;

func
    : FUNC funcName '(' params ')' block
        {$$ = ['func', $2, $4, $6]}
    | FUNC funcName '(' params ')' '=>' e %prec FUNC
        {$$ = ['func', $2, $4, ['expBody', $7]]}
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
    | nonEmptyParams
        {$$ = ['params', $1]}
    ;

nonEmptyParams
    : param
        {$$ = [$1]}
    | nonEmptyParams ',' param
        {$$ = [...$1, $3]}
    ;

param
    : IDENTIFIER
        {$$ = ['param', $1]}
    | IDENTIFIER ':' IDENTIFIER
        {$$ = ['param', $1, $3]}
    ;

block
    : '{' statements '}'
        {$$ = ['block', $2]}
    ;

e
    : e '**' e
        {$$ = ['**', $1, $3]}
    | e ':=' e
        {$$ = [':=', $1, $3]}
    | '++' e %prec PREFIX
        {$$ = ['prefix ++', $2]}
    | '--' e %prec PREFIX
        {$$ = ['prefix --', $2]}
    | e '++' %prec POSTFIX
        {$$ = ['postfix ++', $2]}
    | e '--' %prec POSTFIX
        {$$ = ['postfix --', $2]}
    | e '<<' e
        {$$ = ['<<', $1, $3]}
    | e '>>' e
        {$$ = ['>>', $1, $3]}
    | e '<=' e
        {$$ = ['<=', $1, $3]}
    | e '>=' e
        {$$ = ['>=', $1, $3]}
    | e '==' e
        {$$ = ['==', $1, $3]}
    | e '!=' e
        {$$ = ['!=', $1, $3]}
    | e '&&' e
        {$$ = ['&&', $1, $3]}
    | e '||' e
        {$$ = ['||', $1, $3]}
    | e '+=' e
        {$$ = ['+=', $1, $3]}
    | e '-=' e
        {$$ = ['-=', $1, $3]}
    | e '*=' e
        {$$ = ['*=', $1, $3]}
    | e '/=' e
        {$$ = ['/=', $1, $3]}
    | e '%=' e
        {$$ = ['%=', $1, $3]}
    | e '<<=' e
        {$$ = ['<<=', $1, $3]}
    | e '>>=' e
        {$$ = ['>>=', $1, $3]}
    | e '&=' e
        {$$ = ['&=', $1, $3]}
    | e '^=' e
        {$$ = ['^=', $1, $3]}
    | e '|=' e
        {$$ = ['|=', $1, $3]}
    | e '*' e
        {$$ = ['*', $1, $3]}
    | e '/' e
        {$$ = ['/', $1, $3]}
    | e '%' e
        {$$ = ['%', $1, $3]}
    | e '-' e
        {$$ = ['-', $1, $3]}
    | e '+' e
        {$$ = ['+', $1, $3]}
    | e '=' e
        {$$ = ['=', $1, $3]}
    | e '!' e
        {$$ = ['!', $1, $3]}
    | e '~' e
        {$$ = ['~', $1, $3]}
    | e '<' e
        {$$ = ['<', $1, $3]}
    | e '>' e
        {$$ = ['>', $1, $3]}
    | e '&' e
        {$$ = ['&', $1, $3]}
    | e '^' e
        {$$ = ['^', $1, $3]}
    | e '|' e
        {$$ = ['|', $1, $3]}
    | '-' e %prec UMINUS
        {$$ = ['-', $2]}
    | e '.' IDENTIFIER
        {$$ = ['.', $1, $3]}
    | '(' e ')'
        {$$ = $2;}
    | e '(' eList ')'
        {$$ = ['functionCall', $1, $3]}
    | e ':' IDENTIFIER '(' eList ')'
        {$$ = ['methodCall', $1, $3, $5]}
    | e '[' e ']'
        {$$ = ['subscript', $1, $3]}
    | NUMBER
        {$$ = ['NUMBER', $1]}
    | IDENTIFIER
        {$$ = ['IDENTIFIER', $1]}
    | STRING
        {$$ = ['STRING', $1]}
    | func
        {$$ = $1}
    | array
        {$$ = $1}
    | object
        {$$ = $1}
    | '(' import ')'
        {$$ = $2}
    | class
        {$$ = $1}
    | switch
        {$$ = $1}
    ;

atomicExp
    : NUMBER
        {$$ = $1}
    | IDENTIFIER
        {$$ = $1}
    | STRING
        {$$ = $1}
    | array
        {$$ = $1}
    | object
        {$$ = $1}
    | '(' import ')'
        {$$ = $2}
    | class
        {$$ = $1}
    | switch
        {$$ = $1}
    | '(' e ')'
        {$$ = $2}
    ;

array
    : '[' eList ']'
        {$$ = ['array', $2]}
    | '[' eListNonEmpty ',' ']'
        {$$ = ['array', $2]}
    ;

eList
    :
        {$$ = []}
    | eListA
        {$$ = $1}
    | eListB
        {$$ = $1}
    ;

eListA
    : e
        {$$ = [$1]}
    | eListB e
        {$$ = [...$1, $2]}
    ;

eListB
    : eListA ','
        {$$ = $1}
    ;

object
    : '{' propList '}'
        {$$ = ['object', $1]}
    | '{' propListNonEmpty ',' '}'
        {$$ = ['object', $1]}
    ;

propList
    :
        {$$ = []}
    | propListNonEmpty
        {$$ = $1}
    ;

propListNonEmpty
    : prop
        {$$ = [$1]}
    | propListNonEmpty ',' prop
        {$$ = [...$1, $3]}
    ;

prop
    : IDENTIFIER ':' e
        {$$ = [$1, $3]}
    ;

class
    : CLASS IDENTIFIER '{' classMembers classMethods '}'
        {$$ = ['class', { name: $2, type: ['members', $4], methods: $5 }]}
    | CLASS IDENTIFIER classType '{' classMethods '}'
        {$$ = ['class', { name: $2, type: ['whole', $3], methods: $5 }]}
    ;

/* TODO: proper type parsing (just IDENTIFIER right now) */
classType
    : ':' IDENTIFIER
        {$$ = $2}
    ;

classMembers
    :
        {$$ = []}
    | classMembers classMember
        {$$ = [...$1, $2]}
    ;

classMember
    : IDENTIFIER ':' IDENTIFIER ';'
        {$$ = [$1, $3]}
    ;

classMethods
    :
        {$$ = []}
    | classMethods classMethod
        {$$ = [...$1, $2]}
    ;

classMethod
    : classMethodModifiers ':' IDENTIFIER '(' params ')' classMethodBody
        {$$ = { modifiers: $1, name: $3, args: $5[1], body: $7 }}
    ;

classMethodModifiers
    :
        {$$ = []}
    | STATIC
        {$$ = ['static']}
    ;

classMethodBody
    : block
        {$$ = $1}
    | '=>' e ';'
        {$$ = ['expBody', $2]}
    ;

switch
    : SWITCH switchValueClause '{' switchCases '}'
        {$$ = ['switch', $2, $4]}
    ;

switchValueClause
    :
        {$$ = null}
    | '(' e ')'
        {$$ = $2}
    ;

switchCases
    :
        {$$ = []}
    | switchCases switchCase
        {$$ = [...$1, $2]}
    ;

switchCase
    : atomicExp '=>' e ';'
        {$$ = [$1, $3]}
    ;
