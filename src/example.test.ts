import {
  Collection,
  Entity,
  ManyToOne,
  MikroORM,
  OneToMany,
  PrimaryKey,
  Property,
  ref,
  Ref,
} from "@mikro-orm/sqlite";

@Entity()
class User {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @Property({ unique: true })
  email: string;

  @OneToMany(() => Address, (address) => address.user)
  addresses = new Collection<Address>(this);

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }
}

@Entity()
class Address {
  @PrimaryKey()
  id!: number;

  @Property()
  type: string;

  @Property()
  country: string;

  @ManyToOne(() => User)
  user: Ref<User>;

  constructor(type: string, country: string, user: User) {
    this.type = type;
    this.country = country;
    this.user = ref(user);
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [User],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test("test without related entity", async () => {
  const user1 = orm.em.create(User, { name: "User1", email: "foo" });
  const user2 = orm.em.create(User, { name: "User2", email: "bar" });
  orm.em.create(Address, {
    type: "home",
    user: user1,
    country: "Zambia",
  });
  orm.em.create(Address, {
    type: "home",
    user: user2,
    country: "Germany",
  });

  await orm.em.flush();
  orm.em.clear();

  const users = await orm.em.find(
    User,
    { addresses: { type: "home" } },
    { limit: 10, orderBy: { addresses: { country: "ASC" } } }
  );

  expect(users.map((u) => u.name)).toEqual(["User2", "User1"]);
});

test("test with non related entity example", async () => {
  const user1 = orm.em.create(User, { name: "User1", email: "foo" });
  const user2 = orm.em.create(User, { name: "User2", email: "bar" });
  orm.em.create(Address, {
    type: "home",
    user: user1,
    country: "Zambia",
  });
  orm.em.create(Address, {
    type: "work",
    user: user1,
    country: "Albania",
  });
  orm.em.create(Address, {
    type: "home",
    user: user2,
    country: "Germany",
  });

  await orm.em.flush();
  orm.em.clear();

  const users = await orm.em.find(
    User,
    { addresses: { type: "home" } },
    { limit: 10, orderBy: { addresses: { country: "ASC" } } }
  );

  expect(users.map((u) => u.name)).toEqual(["User2", "User1"]);
});
