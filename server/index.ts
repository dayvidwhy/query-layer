import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { Users } from "@db/database";

const typeDefs = `#graphql
    type Query {
        getUser(id: ID!): User,
        getAllUsers: [User]
    }

    type Mutation {
        createUser(name: String!, email: String!): User,
        deleteUser(id: ID!): User,
        updateUser(name: String!, email: String!, id: ID!): User,
    }

    type User {
        id: ID!
        name: String!
        email: String!
    }
`;

const resolvers = {
    Mutation: {
        deleteUser: async (_, { id }, { users }) => {
            const user = await users.findByPk(id);
            await user.destroy();
            return user;
        },
        createUser: async (_, { name, email }, { users }) => {
            return await users.create({ name, email });
        },
        updateUser: async (_, { id, name, email }, { users }) => {
            const user = await users.findByPk(id);
            user.name = name;
            user.email = email;
            await user.save();
            return user;
        },
    },
    Query: {
        getUser: async (_, { id }, { users }) => {
            return await users.findByPk(id);
        },
        getAllUsers: async (_, __, { users }) => {
            return await users.findAll();
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers
});

const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => {
        return {
            users: Users
        };
    }
});
  
console.log(`Server listening at: ${url}`);
