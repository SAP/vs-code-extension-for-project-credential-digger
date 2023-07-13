import { faker } from '@faker-js/faker';
import { Discovery, Rule, State } from '../../types/db';

export function generateRule(): Rule {
    return {
        id: faker.number.int(),
        regex: faker.lorem.sentence(),
        category: faker.color.human(),
        description: faker.lorem.sentence(),
    };
}

export function generateDiscovery(lineNumber?: number): Discovery {
    return {
        id: faker.number.int(),
        filename: faker.system.filePath(),
        commitId: faker.git.commitSha(),
        lineNumber: lineNumber ?? faker.number.int({ min: 0 }),
        snippet: faker.lorem.text(),
        repoUrl: faker.internet.url(),
        ruleId: faker.number.int(),
        state: State.New,
        timestamp: faker.date.anytime().toISOString(),
        rule: generateRule(),
    };
}

export function generateDiscoveries(count: number): Discovery[] {
    const discoveries = [];
    for (let x = 0; x < count; x++) {
        discoveries.push(generateDiscovery(x + 1));
    }
    return discoveries;
}
