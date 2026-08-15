import unittest

from app.middleware.rbac_middleware import evaluate_backend_access


class AccessGateTests(unittest.TestCase):
    def test_blocks_forbidden_module_and_engine(self):
        decision = evaluate_backend_access(
            module_id="quarries-mining",
            engine_code="M103",
            granted_modules=["endowment"],
        )

        self.assertFalse(decision["allowed"])
        self.assertEqual(decision["status"], 403)
        self.assertIn("quarries-mining", decision["blocked_modules"])
        self.assertIn("M103", decision["blocked_engines"])

    def test_allows_granted_module(self):
        decision = evaluate_backend_access(
            module_id="endowment",
            engine_code=None,
            granted_modules=["endowment"],
        )

        self.assertTrue(decision["allowed"])
        self.assertEqual(decision["status"], 200)
        self.assertEqual(decision["blocked_modules"], [])


if __name__ == "__main__":
    unittest.main()
