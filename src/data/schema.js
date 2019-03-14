// data/schema.js

const { gql } = require('apollo-server-express');


// Define our schema using the GraphQL schema language
const typeDefs = gql`
  "Base user type"
  type User {
    "User unique id"
    id: ID!
    "Email address for user.  Will be used as display name of user and for login"
    email: String!
    "Tenant id that the user is a member of"
    tenantId: String!
  }
  type Login {
    "Bearer token returned as a result of successful login"
    authToken: String!
  }
  "Base tenant type"
  type Tenant {
    "Tenant unique id"
    id: ID!
    "The full name of the tenant"
    name: String!
  }
  type Query {
    "Query to find logged in user based upon Bearer token"
    me: User

    "Query to find list of current tenants"
    listTenants: [Tenant]
    
    "Query to find list of current users for a given tenant"
    listUsers: [User]
  }
  type Mutation {
    "Create a new tenant"
    createTenant(
      "The full name of the tenant"
      name: String!
    ):Tenant

    "Delete a tenant"
    deleteTenant(
      "The unique id of the tenant"
      id: String!
    ): Tenant

    "Create a tenant"
    createUser(
      "Tenant unique id"
      tenantId: String!, 
      "Email of the user"
      email: String!, 
      "Password used to login"
      password: String!
    ): User

    "Delete a user"
    deleteUser (
      "The unique id of the user"
      id: String!
    ): User
    
    "Login a user"
    login (
      "Email of the user"
      email: String!, 
      "Password for the user"
      password: String!
    ): Login

    "Change the password of a user for login"
    changePassword(
      "Email of the user"
      email: String!,
      "Current password for the user"
      currentpassword: String!, 
      "New password for the user"
      newpassword: String!): User
    
    "Send password reset for a user in case of lost password"
    resetPassword (
      "Email of the user to reset"
      email: String!
    ): User!
  }
`;

module.exports = typeDefs
