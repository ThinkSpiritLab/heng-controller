import { Test, TestingModule } from "@nestjs/testing";
import { JudgerPoolService } from "./judger-pool.service";

describe("JudgerPoolService", () => {
    let service: JudgerPoolService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [JudgerPoolService],
        }).compile();

        service = module.get<JudgerPoolService>(JudgerPoolService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
