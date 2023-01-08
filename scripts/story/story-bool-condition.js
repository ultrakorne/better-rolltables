/*
gender == "male" AND race == "human" OR x != "bla"

S:: = Expression
Expression:: = SubExpression
             | SubExpression ' AND ' Expression
             | SubExpression ' OR ' Expression
SubExpression:: = Definition '==' Value
                | Definition '!=' Value
Definition:: = [a-zA-Z]
Value:: = '"' [a-zA-Z] '"'
*/

export class StoryBoolCondition {
  evaluate() {
    return true;
  }
}
