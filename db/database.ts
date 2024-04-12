import { Sequelize, DataTypes,  } from "sequelize";
import type { Optional, ModelDefined } from "sequelize";

export const db = new Sequelize({
    dialect: "sqlite",
    storage: "./sqlite.db",
    define: {
        // prevent sequelize from pluralizing table names
        freezeTableName: true
    }
});

interface UsersAttributes {
    id: string;
    name: string;
    email: string;
}

export const Users: ModelDefined<
    UsersAttributes,
    Optional<UsersAttributes, "id"> // id is optional for creation
> = db.define("Users", {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    }
}, {
    tableName: "Users"
});

interface PasswordAttributes {
    id: string;
    password: string;
};

export const Passwords: ModelDefined<
    PasswordAttributes,
    PasswordAttributes
> = db.define("Passwords", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: "Passwords"
});

Users.hasOne(Passwords, {
    foreignKey: "id",
    onDelete: "CASCADE"
});

Passwords.belongsTo(Users, {
    foreignKey: "id",
    onDelete: "CASCADE"
});

export default {
    db,
    Users,
    Passwords
};

(async () => {
    await db.sync();
})();
