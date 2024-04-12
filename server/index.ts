import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import db from "@db/database";
import { hash, compare } from "@server/hash";
import { GraphQLError } from "graphql";

const typeDefs = `#graphql
    type Query {
        getUser(id: ID!): User,
        getAllUsers: [User],
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
        deleteUser: async (_, { id }, { users, isLoggedIn }) => {
            if (!isLoggedIn) {
                throw new GraphQLError("User is not authenticated", {
                    extensions: {
                        code: "UNAUTHENTICATED",
                        http: { status: 401 },
                    },
                });
            }
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
        updateUser: async (_, { id, name, email }, { users, isLoggedIn }) => {
            if (!isLoggedIn) {
                throw new GraphQLError("User is not authenticated", {
                    extensions: {
                        code: "UNAUTHENTICATED",
                        http: { status: 401 },
                    },
                });
            }
            const user = await users.findByPk(id);
            user.name = name;
            user.email = email;
            await user.save();
            return user;
        },
    },
    Query: {
        getUser: async (_, { id }, { users, isLoggedIn }) => {
            if (!isLoggedIn) {
                throw new GraphQLError("User is not authenticated", {
                    extensions: {
                        code: "UNAUTHENTICATED",
                        http: { status: 401 },
                    },
                });
            }
            return await users.findByPk(id);
        },
        getAllUsers: async (_, __, { users, isLoggedIn }) => {
            if (!isLoggedIn) {
                throw new GraphQLError("User is not authenticated", {
                    extensions: {
                        code: "UNAUTHENTICATED",
                        http: { status: 401 },
                    },
                });
            }
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
    context: async ({ req }) => {
        let isLoggedIn = false;
        const auth = req.headers.authorization;
        if (auth) {
            const authFormat = new RegExp(/^Basic [A-Za-z0-9+/]+={0,2}$/);
            if (authFormat.test(auth) === false) {
                throw new GraphQLError("Auth failure", {
                    extensions: {
                        code: "UNAUTHENTICATED",
                        http: { status: 401 },
                    },
                });
            }

            const base64Credentials = auth.split(" ")[1];
            const [username, password] = Buffer.from(base64Credentials, "base64").toString().split(":");
            console.log(username, password);
            const user = await db.Users.findOne({ where: { email: username } });
            if (!user) {
                throw new GraphQLError("Auth failure", {
                    extensions: {
                        code: "UNAUTHENTICATED",
                        http: { status: 401 },
                    },
                });
            }

            const passwordHash = await db.Passwords.findOne({ where: { id: (user as any).id } });

            if (!passwordHash) {
                throw new GraphQLError("Auth failure", {
                    extensions: {
                        code: "UNAUTHENTICATED",
                        http: { status: 401 },
                    },
                });
            }

            const passwordHashValue = passwordHash.get("password") as string;

            if (await compare(password, passwordHashValue)) {
                isLoggedIn = true;
            } else {
                throw new GraphQLError("Auth failure", {
                    extensions: {
                        code: "UNAUTHENTICATED",
                        http: { status: 401 },
                    },
                });
            }
        }

        return {
            users: db.Users,
            passwords: db.Passwords,
            isLoggedIn
        };
    }
});
  
console.log(`Server listening at: ${url}`);
