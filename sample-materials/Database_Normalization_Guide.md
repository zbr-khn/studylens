# Lecture 6: Relational Database Normalization
Course: Database Systems (CS-305)
University Computer Science Syllabus

## Section 6.1: The Purpose of Normalization
Database normalization is the process of structuring a relational database in accordance with normal forms to reduce data redundancy, prevent update, insertion, and deletion anomalies, and ensure data integrity.

## Section 6.2: Normal Forms Hierarchy

### First Normal Form (1NF)
A relation R is in 1NF if:
1. Every attribute domain contains only atomic (indivisible) values.
2. There are no repeating groups or multivalued attributes.

### Second Normal Form (2NF)
A relation R is in 2NF if:
1. It is in 1NF.
2. Every non-prime attribute is fully functionally dependent on the entire primary key (no partial dependencies on a proper subset of a composite primary key).

### Third Normal Form (3NF)
A relation R is in 3NF if:
1. It is in 2NF.
2. There are no transitive dependencies: for every non-trivial functional dependency X \to Y, either:
   - X is a superkey of R, OR
   - Y is a prime attribute (part of a candidate key).

### Boyce-Codd Normal Form (BCNF)
A stronger version of 3NF. A relation R is in BCNF if for every non-trivial functional dependency X \to Y:
- X must be a superkey of R.
Note: Every relation in BCNF is in 3NF, but a 3NF relation is not necessarily in BCNF when there are overlapping composite candidate keys.
