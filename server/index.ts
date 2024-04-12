import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import db from "@db/database";
import { hash, compare } from "@server/hash";

const typeDefs = `#graphql
    type Query {
        getUser(id: ID!): User,
        getAllUsers: [User],
        login(email: String!, password: String!): User
    }

    type Mutation {
        createUser(
            name: String!,
            email: String!
            password: String!
        ): User,
        deleteUser(
            id: ID!
        ): User,
        updateUser(
            name: String!,
            email: String!,
            id: ID!
        ): User,
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
        createUser: async (_, { name, email, password }, { users }) => {
            const user = await users.create({ name, email });
            const passwordHash = await hash(password);
            await user.createPassword({
                id: user.id,
                password: passwordHash
            });
            return user;
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
        },
        login: async (_, { email, password }, { users, passwords }) => {
            const user = await users.findOne({ where: { email } });
            if (!user) {
                throw new Error("Authentication failed.");
            }

            const passwordHash = await passwords.findOne({ where: { id: user.id } });

            if (!passwordHash) {
                throw new Error("Authentication failed.");
            }

            if (!(await compare(password, passwordHash.password))) {
                throw new Error("Authentication failed.");
            }

            return user;
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
            users: db.Users,
            passwords: db.Passwords
        };
    }
});
  
console.log(`Server listening at: ${url}`);
